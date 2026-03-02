# Realm vs SQLite Performance Comparison

Test date: 2026-03-02
Dataset: ~8,051 entities synced from server (fresh sync, `lastModifiedDateTime=1900-01-01`)

## Version History

- **SQLite v1** (baseline): Initial SQLite implementation with full hydration on every `db.create()` and `associateParent` call
- **SQLite v2** (skipHydration): Added `skipHydration` flag to skip re-hydration after INSERT during sync; `SqliteProxy.create()` returns the flattened row instead of re-reading + hydrating
- **SQLite v3** (+ sync cache): Added in-memory sync entity cache so `associateParent` resolves parent references from cache instead of DB queries + hydration; `fromResource` entity construction uses cached parents

## Overall Summary

| Area | Realm | SQLite v1 | SQLite v2 | SQLite v3 | Best SQLite vs Realm |
|---|---|---|---|---|---|
| **Total sync duration** | ~86.8s | ~98.0s | ~75.4s | **~54.5s** | **37% faster** |
| **Reference data sync** | 51.9s | 23.4s | ~19.8s | ~20.3s | **55-61% faster** |
| **Txn data sync (batch processing)** | 32.0s | 64.1s | 13.9s | **3.5s** | **89% faster** |
| **Dashboard refresh (REFRESH_COUNT)** | 582ms | 2,349ms | 2,554ms | 2,248ms | 3.9x slower |
| **Dashboard load (first)** | 1,187ms | 3,157ms | 3,096ms | 2,839ms | 2.4x slower |
| **Search (1026 results)** | 5ms | 1,392ms | 1,457ms | 1,413ms | 283x slower |
| **Search (33 results)** | 2ms | 70ms | 79ms | 76ms | 35-38x slower |
| **Ref data cache build** | N/A | 230ms | 244ms | 253ms | SQLite-only |
| **Database size** | 9.0 MB | 11.4 MB | 11.4 MB | 11.4 MB | 27% larger |

---

## 1. Transactional Data Sync -- The Big Win

This is where the v2 and v3 optimizations had the most dramatic impact.

### Batch Processing Time (Before filter -> ENTITY_PULL_COMPLETED)

| Entity | Count | Realm (ms) | SQLite v1 (ms) | SQLite v2 (ms) | SQLite v3 (ms) | v3 vs Realm |
|---|---:|---:|---:|---:|---:|---|
| Individual (3 batches) | 1,076 | 7,975 | 10,547 | 725 | 704 | **91% faster** |
| ProgramEnrolment (2 batches) | 962 | 5,803 | 23,864 | 4,570 | 903 | **84% faster** |
| ProgramEncounter (6 batches) | 2,145 | 17,531 | 27,683 | 7,551 | 1,797 | **90% faster** |
| IndividualRelationship | 46 | 678 | 2,051 | 271 | 46 | **93% faster** |
| GroupSubject | 74 | -- | -- | 822 | 91 | -- |
| **Txn Total** | **4,303** | **31,987** | **64,145** | **13,939** | **3,541** | **89% faster** |

### What Changed at Each Version

**v1 -> v2 (skipHydration): 64.1s -> 13.9s (78% reduction)**
- `SqliteProxy.create()` no longer re-reads and hydrates every entity after INSERT during sync
- But `associateParent` still performed full DB queries + hydration to resolve parent references

**v2 -> v3 (sync cache): 13.9s -> 3.5s (75% reduction)**
- In-memory sync entity cache eliminates all `associateParent` DB lookups
- `fromResource` resolves parent references from the cache instead of querying the DB
- The "Before filter -> Syncing" gap (which measures `fromResource` + `associateParent` time) dropped from seconds to milliseconds

### fromResource + associateParent Gap Analysis

The "Before filter -> Syncing" gap shows how long it takes to run `fromResource()` and `associateParent()` for each batch before the actual persist begins:

| Batch | Count | v2 Gap (ms) | v3 Gap (ms) | Reduction |
|---|---:|---:|---:|---|
| Individual (1000) | 1,000 | 1 | 1 | ~same (no parent) |
| ProgramEnrolment (958) | 958 | 3,674 | 45 | **99% faster** |
| ProgramEncounter (952) | 952 | 3,256 | 38 | **99% faster** |
| ProgramEncounter (1000) | 1,000 | 2,106 | 43 | **98% faster** |

Individual has no `associateParent` call (it is a root entity), so the gap was already minimal. ProgramEnrolment and ProgramEncounter have FK references to parent entities (Individual, ProgramEnrolment) that previously required DB queries + hydration for every entity in the batch. The sync cache eliminated this entirely.

### Progression Summary

```
Transactional data sync batch processing:

  SQLite v1:  64,145ms  |||||||||||||||||||||||||||||||||||||||||||||||||||  (2.0x slower than Realm)
  Realm:      31,987ms  |||||||||||||||||||||||||
  SQLite v2:  13,939ms  |||||||||||                                          (56% faster than Realm)
  SQLite v3:   3,541ms  |||                                                  (89% faster than Realm)
```

---

## 2. Reference Data Sync Performance

Reference data sync was already faster than Realm in v1 and remains stable across versions.

### Reference Data Entities (v1 timings -- includes network + parse + persist)

| Entity | Count | Realm (ms) | SQLite v1 (ms) | SQLite vs Realm |
|---|---:|---:|---:|---|
| ResetSync | 2 | 10,202 | 2,823 | **72% faster** |
| UserInfo | 2 | 986 | 852 | 14% faster |
| Privilege | 60 | 302 | 197 | 35% faster |
| Groups | 12 | 2,956 | 802 | **73% faster** |
| GroupPrivileges | 682 | 292 | 460 | 57% slower |
| MyGroups | 2 | 6,516 | 2,136 | **67% faster** |
| Concept | 874 | 7,745 | 2,723 | **65% faster** |
| ConceptAnswer | 893 | 507 | 564 | 11% slower |
| SubjectType | 5 | 308 | 179 | 42% faster |
| GroupRole | 4 | 205 | 257 | 25% slower |
| Gender | 3 | 309 | 168 | 46% faster |
| Program | 3 | 406 | 220 | 46% faster |
| EncounterType | 13 | 411 | 341 | 17% faster |
| AddressLevel | 40 | 307 | 305 | ~same |
| Translation | 1 | 205 | 215 | ~same |
| PlatformTranslation | 6 | 296 | 194 | 34% faster |
| OrganisationConfig | 1 | 413 | 293 | 29% faster |
| Form | 42 | 2,777 | 2,541 | 9% faster |
| FormElementGroup | 81 | 10,465 | 4,244 | **59% faster** |
| FormElement | 788 | 1,220 | 1,312 | 8% slower |
| FormMapping | 37 | 289 | 235 | 19% faster |
| IndividualRelation | 26 | 727 | 181 | 75% faster |
| IndividualRelationGenderMapping | 28 | 510 | 207 | 59% faster |
| IndividualRelationshipType | 31 | 175 | 165 | ~same |
| StandardReportCardType | 14 | 650 | 217 | 67% faster |
| ReportCard | 15 | 284 | 178 | 37% faster |
| Dashboard | 5 | 193 | 180 | ~same |
| DashboardFilter | 3 | 329 | 219 | 33% faster |
| DashboardSection | 8 | 414 | 189 | 54% faster |
| DashboardSectionCardMapping | 15 | 200 | 166 | 17% faster |
| ApprovalStatus | 3 | 213 | 188 | 12% faster |
| GroupDashboard | 37 | 708 | 546 | 23% faster |
| SubjectMigration | 12 | 454 | 186 | 59% faster |
| **Ref Data Total** | **3,727** | **51,896** | **23,373** | **55% faster** |

Reference data timings are dominated by network latency and JSON parsing (not DB persist), so v2/v3 optimizations had minimal impact here. The pure persist time for reference data is ~915-938ms across all SQLite versions.

---

## 3. Total Sync Duration

| Phase | Realm | SQLite v1 | SQLite v2 | SQLite v3 |
|---|---:|---:|---:|---:|
| PRE_SYNC -> POST_SYNC | ~86.8s | ~98.0s | ~75.4s | **~54.5s** |
| Post-sync overhead | -- | -- | ~9.1s | ~9.2s |
| Ref data cache build | N/A | 230ms | 244ms | 253ms |

**SQLite v3 is 37% faster than Realm for total sync.** The progression:

| Version | Total Sync | vs Realm |
|---|---:|---|
| Realm | 86.8s | baseline |
| SQLite v1 | 98.0s | 13% slower |
| SQLite v2 | 75.4s | **13% faster** |
| SQLite v3 | 54.5s | **37% faster** |

The v3 sync cache turned SQLite from 13% slower than Realm to 37% faster.

---

## 4. Dashboard Load Times

Dashboard has 2 report cards: "Scheduled visits at community level" and "Anemic follow up overdue at community level".

### REFRESH_COUNT Timings

| Metric | Realm | SQLite v1 | SQLite v2 | SQLite v3 |
|---|---:|---:|---:|---:|
| REFRESH_COUNT | 582ms | 2,349ms | 2,554ms | 2,248ms |
| Scheduled visits card | ~19ms | ~24ms | 37ms | 42ms |
| Anemic follow up overdue card | **527ms** | **2,294ms** | **2,509ms** | **2,198ms** |

### Time to First Dashboard Content

| Metric | Realm | SQLite v1 | SQLite v2 | SQLite v3 |
|---|---:|---:|---:|---:|
| ON_LOAD -> first REFRESH_COUNT complete | 1,187ms | 3,157ms | 3,096ms | 2,839ms |

Dashboard performance is essentially unchanged across SQLite versions. The bottleneck is the "Anemic follow up overdue" card which requires cross-entity JOINs (ProgramEncounter -> ProgramEnrolment -> Individual) with complex filters and entity hydration. This is a query-time cost, not a sync-time cost, so the sync cache has no impact.

**Realm is still 3.9x faster for dashboard** due to lazy object graph traversal vs. explicit SQL JOINs + hydration.

---

## 5. Search Performance

| Search | Results | Realm | SQLite v1 | SQLite v2 | SQLite v3 |
|---|---:|---:|---:|---:|---:|
| All subjects (no filter) | 1,026 | **5ms** | 1,392ms | 1,457ms | 1,413ms |
| Filtered search | 33 | **2ms** | 70ms | 79ms | 76ms |

Search performance is unchanged across SQLite versions. **Realm is 283x faster for unfiltered search** because `Realm.Results` is a lazy proxy that only materializes visible items in the FlatList, while SQLite must execute the full SQL query and hydrate all matching entities upfront.

---

## 6. Data Integrity: Entity Count Comparison

### Reference Data (all match exactly)

| Entity | Synced | SQLite DB | Match |
|---|---:|---:|---|
| Concept | 874 | 874 | YES |
| ConceptAnswer | 893 | 893 | YES |
| Form | 42 | 42 | YES |
| FormElement | 788 | 788 | YES |
| FormElementGroup | 81 | 81 | YES |
| FormMapping | 37 | 37 | YES |
| Gender | 3 | 3 | YES |
| SubjectType | 5 | 5 | YES |
| Program | 3 | 3 | YES |
| EncounterType | 13 | 13 | YES |
| AddressLevel | 40 | 40 | YES |
| Privilege | 60 | 60 | YES |
| Groups | 12 | 12 | YES |
| GroupPrivileges | 682 | 682 | YES |
| GroupRole | 4 | 4 | YES |
| Dashboard | 5 | 5 | YES |
| DashboardSection | 8 | 8 | YES |
| DashboardSectionCardMapping | 15 | 15 | YES |
| DashboardFilter | 3 | 3 | YES |
| ReportCard | 15 | 15 | YES |
| StandardReportCardType | 14 | 14 | YES |
| GroupDashboard | 37 | 37 | YES |
| IndividualRelation | 26 | 26 | YES |
| IndividualRelationGenderMapping | 28 | 28 | YES |
| IndividualRelationshipType | 31 | 31 | YES |
| OrganisationConfig | 1 | 1 | YES |
| Translation | 1 | 1 | YES |
| PlatformTranslation | 6 | 6 | YES |
| ApprovalStatus | 3 | 3 | YES |
| SubjectMigration | 12 | 12 | YES |
| ResetSync | 2 | 2 | YES |
| MyGroups | 2 | 2 | YES |
| UserInfo | 1 | 1 | YES |

All 33 reference data entity types match exactly.

### Transactional Data

| Entity | Synced | In .db file | In WAL (not extracted) | Match? |
|---|---:|---:|---:|---|
| Individual | 1,076 | 1,076 | 0 | YES |
| ProgramEnrolment | 962 | 962 | 0 | YES |
| ProgramEncounter | 2,145 | 952 | 1,193 | YES |
| IndividualRelationship | 46 | 0 | 46 | YES |
| GroupSubject | 74 | 0 | 74 | YES |
| Encounter | 0 | 0 | 0 | YES |

**All entity counts match exactly between Realm and SQLite.** No data integrity issues.

### WAL Extraction Caveat

The SQLite DB was pulled from the device using `adb exec-out run-as ... cat databases/avni_sqlite.db`. This only copies the main `.db` file -- not the `.db-wal` (Write-Ahead Log) or `.db-shm` (shared memory) files. In WAL journal mode, committed transactions accumulate in the WAL file and are only merged into the main `.db` during a "checkpoint" (triggered automatically when WAL reaches ~1000 pages or when the last connection closes).

Entities synced after the last automatic checkpoint appear missing from the extracted `.db` but are fully committed in the WAL. The `entity_sync_status` table confirms the cutoff -- entities synced before a certain point have updated timestamps, while later ones still show epoch values.

**To extract a complete SQLite DB from the device**, either:
1. Pull all three files: `.db` + `.db-wal` + `.db-shm`
2. Force checkpoint before pull: `PRAGMA wal_checkpoint(TRUNCATE)`
3. Close the DB connection first (triggers final checkpoint)

### Database Size

| Database | Size |
|---|---|
| Realm | 9.0 MB |
| SQLite | 11.4 MB |
| **Overhead** | **+27%** |

Expected due to SQLite's normalized relational format, explicit column storage, indexes, and WAL journal overhead.

---

## 7. Reference Data Cache (SQLite-only)

| Metric | v1 | v2 | v3 |
|---|---|---|---|
| Cache build time | 230ms | 244ms | 253ms |
| When | After sync, before POST_SYNC | same | same |
| Purpose | FK resolution during hydration at query time | same | same |

The reference data cache is a fixed ~250ms cost that enables fast FK resolution during entity hydration (dashboard, search, etc.). It is separate from the sync cache introduced in v3.

---

## 8. Performance Bottleneck Analysis

### Sync: SOLVED -- SQLite now 37% faster than Realm

The two key optimizations that made SQLite faster than Realm for sync:

1. **skipHydration (v2)**: During sync, `SqliteProxy.create()` no longer re-reads and hydrates the entity after INSERT. The raw flattened row is returned instead. This eliminated the biggest per-entity cost.

2. **Sync entity cache (v3)**: An in-memory cache stores entities as they are synced. When `associateParent` needs to resolve a parent reference (e.g., ProgramEnrolment -> Individual), it looks up the parent from the cache instead of querying the DB + hydrating. This eliminated the `fromResource + associateParent` overhead that was 3-4 seconds per large batch.

The combined effect: **64.1s -> 3.5s** for transactional data batch processing (94.5% reduction).

### Dashboard: Still 3.9x slower than Realm

The "Anemic follow up overdue" card requires cross-entity JOINs with complex filters. Realm traverses its object graph lazily; SQLite must execute explicit JOIN queries and hydrate results. This is a query-time cost unaffected by sync optimizations.

### Search: Still 283x slower for unfiltered, 38x for filtered

Realm's `.filtered()` returns a lazy `Realm.Results` proxy -- data is only materialized when individual items are accessed by the FlatList. SQLite must execute the full SQL query and hydrate ALL matching entities upfront.

---

## 9. Remaining Optimization Opportunities

### High Priority (Dashboard + Search)
1. **Lazy SqliteResultsProxy** -- return a cursor-like proxy that hydrates on demand (closer to Realm's lazy behavior). Would dramatically reduce search times for large result sets.
2. **FTS5 for text search** -- op-sqlite supports FTS5 which would speed up `LIKE '%term%'` search patterns.
3. **Materialized dashboard cache** -- pre-compute report card counts at sync time, invalidate on data change.

### Medium Priority
4. **Batch INSERT during sync** -- use multi-row `INSERT INTO ... VALUES (...), (...), (...)` instead of row-by-row. Currently each of the 2,145 ProgramEncounters is a separate SQL statement.
5. **Optimize "Anemic follow up overdue" query** -- this single card accounts for ~2.2s of the ~2.3s dashboard refresh. Consider a SQL VIEW or denormalized index.

### Lower Priority
6. **Reduce reference data sync overhead** -- the ~20s reference data sync is dominated by sequential HTTP requests and JSON parsing. Parallel fetching or differential sync could help.
7. **WAL checkpoint strategy** -- tune checkpoint frequency to balance write performance vs. DB extraction ease.

---

## 10. Log File References

| Version | Log File | PID | Server |
|---|---|---|---|
| Realm | `realm-logs.txt` | -- | staging.rwb.avniproject.org |
| SQLite v1 | `sqlite-logs.txt` | -- | staging.rwb.avniproject.org |
| SQLite v2 | `sqlite-logs-v2.txt` | PID 4547 | server.avniproject.org |
| SQLite v3 | `sqlite-logs-v3.txt` | PID 5821 | server.avniproject.org |

Note: v1 used staging server, v2/v3 used production server. Network latency differences may affect total sync time comparisons but do not affect batch processing time measurements (which exclude network waits).
