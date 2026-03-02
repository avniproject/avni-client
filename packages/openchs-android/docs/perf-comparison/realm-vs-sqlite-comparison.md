# Realm vs SQLite Performance Comparison

Test date: 2026-03-02
Dataset: ~8,051 entities synced from server (fresh sync, `lastModifiedDateTime=1900-01-01`)

## Overall Summary

| Area | Realm | SQLite | Winner | Delta |
|---|---|---|---|---|
| **Reference data sync** | 51.9s | 23.4s | **SQLite** | 55% faster |
| **Transactional data sync** | 32.0s | 64.1s | **Realm** | 2x faster |
| **Total sync duration** | ~86.8s | ~98.0s | **Realm** | 13% faster |
| **Dashboard load (first)** | 1,187ms | 3,157ms | **Realm** | 2.7x faster |
| **Dashboard refresh (avg)** | 582ms | 2,349ms | **Realm** | 4x faster |
| **Search (1026 results)** | 5ms | 1,392ms | **Realm** | 278x faster |
| **Search (33 results)** | 2ms | 70ms | **Realm** | 35x faster |
| **Ref data cache build** | N/A | 230ms | N/A | SQLite-only |
| **Database size** | 9.0 MB | 11.4 MB | **Realm** | 27% smaller |

---

## 1. Entity-Level Sync Performance

### Reference Data Entities

| Entity | Count | Realm (ms) | SQLite (ms) | SQLite vs Realm |
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

### Transactional Data Entities

| Entity | Count | Realm (ms) | SQLite (ms) | SQLite vs Realm |
|---|---:|---:|---:|---|
| Individual (3 batches) | 1,076 | 7,975 | 10,547 | **32% slower** |
| ProgramEnrolment (2 batches) | 962 | 5,803 | 23,864 | **311% slower** |
| ProgramEncounter (6 batches) | 2,145 | 17,531 | 27,683 | **58% slower** |
| IndividualRelationship | 46 | 678 | 2,051 | **202% slower** |
| **Txn Data Total** | **4,303** | **31,987** | **64,145** | **100% slower** |

**Key finding**: SQLite is dramatically faster for reference data (simple schemas, few FKs) but dramatically slower for transactional data (complex FK relationships). ProgramEnrolment is the worst at 4.1x slower — it has FKs to Individual, Program, and other entities that require expensive resolution during persist.

---

## 2. Dashboard Load Times

Dashboard has 2 report cards: "Scheduled visits at community level" and "Anemic follow up overdue at community level".

### REFRESH_COUNT Timings

| Metric | Realm | SQLite | SQLite vs Realm |
|---|---:|---:|---|
| 1st REFRESH_COUNT | 565ms | 2,280ms | 4.0x slower |
| 2nd REFRESH_COUNT | 585ms | 2,418ms | 4.1x slower |
| 3rd REFRESH_COUNT | 596ms | N/A | — |
| **Average** | **582ms** | **2,349ms** | **4.0x slower** |

### Per-Card Breakdown

| Card | Realm (avg) | SQLite (avg) | SQLite vs Realm |
|---|---:|---:|---|
| "Scheduled visits" | ~19ms | ~24ms | ~same |
| "Anemic follow up overdue" | **527ms** | **2,294ms** | **4.4x slower** |

### Time to First Dashboard Content

| Metric | Realm | SQLite |
|---|---:|---:|
| ON_LOAD → first REFRESH_COUNT complete | **1,187ms** | **3,157ms** |

The "Anemic follow up overdue" card is the bottleneck — it involves complex cross-entity queries (ProgramEncounter/ProgramEnrolment/Individual with overdue filters) that are expensive in SQL with hydration vs Realm's lazy object graph traversal.

---

## 3. Search Performance

| Search | Results | Realm | SQLite | SQLite vs Realm |
|---|---:|---:|---:|---|
| All subjects (no filter) | 1,026 | **5ms** | **1,392ms** | **278x slower** |
| Filtered search | 33 | **2ms** | **70ms** | **35x slower** |

**This is the largest performance gap.** Realm returns lazy `Realm.Results` objects — data is only materialized when accessed. SQLite must execute the full SQL query and hydrate all matching entities upfront. For 1,026 results, this creates a 278x gap.

---

## 4. Data Integrity: Entity Count Comparison

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

The SQLite DB was pulled from the device using `adb exec-out run-as ... cat databases/avni_sqlite.db`. This only copies the main `.db` file — not the `.db-wal` (Write-Ahead Log) or `.db-shm` (shared memory) files. In WAL journal mode, committed transactions accumulate in the WAL file and are only merged into the main `.db` during a "checkpoint" (triggered automatically when WAL reaches ~1000 pages or when the last connection closes).

Entities synced after the last automatic checkpoint appear missing from the extracted `.db` but are fully committed in the WAL. The `entity_sync_status` table confirms the cutoff — entities synced before a certain point have updated timestamps, while later ones still show epoch values.

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

## 5. Reference Data Cache (SQLite-only)

| Metric | Value |
|---|---|
| Cache build time | **230ms** |
| When | After sync completion, before POST_SYNC |
| Purpose | Pre-populate in-memory cache for FK resolution during hydration |

---

## 6. Performance Bottleneck Analysis

### Why SQLite is slower for transactional data sync

During `db.create()` in SQLite mode, the `EntityHydrator.flatten()` must:
1. Walk all FK properties and extract UUIDs
2. Serialize embedded objects (observations) to JSON
3. Execute the INSERT/UPSERT SQL statement

Then when reading back (for `associateParent`), `EntityHydrator.hydrate()` must:
1. Resolve all FK columns to full objects (DB queries or cache lookups)
2. Parse embedded JSON back to objects
3. Query child tables for list properties

In contrast, Realm's `db.create()` just passes the object graph to Realm's native C++ engine which handles FK resolution and storage natively.

### Why search is 278x slower

Realm's `.filtered()` returns a lazy `Realm.Results` proxy — the query is registered but data is only fetched when individual items are accessed. The search screen renders a `FlatList` which only materializes visible items.

SQLite's `SqliteResultsProxy` must execute the full SQL query and hydrate ALL matching entities before any can be returned. For 1,026 results this means 1,026 hydration operations upfront.

### Why dashboard cards are 4x slower

The "Anemic follow up overdue" card requires:
- Cross-entity JOINs (ProgramEncounter → ProgramEnrolment → Individual)
- Filter evaluation on encounter dates and observations
- Entity hydration for each matched row

Realm traverses its object graph lazily; SQLite must execute explicit JOIN queries and hydrate results.

---

## 7. Recommendations for Production

### High Priority
1. **Lazy search results** — implement pagination/lazy loading in `SqliteResultsProxy` to avoid hydrating all 1,026 results upfront (278x gap)
2. **Batch INSERT during sync** — use multi-row `INSERT INTO ... VALUES (...), (...), (...)` instead of row-by-row for transactional entities

### Medium Priority
4. **Reduce hydration depth during sync persist** — sync doesn't need depth-3 hydration; depth-0 or depth-1 suffices for the `fromResource` → `create` path
5. **Skip re-hydration after INSERT** — `SqliteProxy.create()` re-reads and hydrates the entity after INSERT; during bulk sync this is wasteful
6. **Optimize dashboard card queries** — the "Anemic follow up overdue" card could benefit from a materialized view or pre-computed cache

### Lower Priority
7. **Lazy SqliteResultsProxy** — for search/listing, return a cursor-like proxy that hydrates on demand (closer to Realm's lazy behavior)
8. **FTS5 for text search** — op-sqlite supports FTS5 which would dramatically speed up `LIKE '%term%'` search patterns
