# Spike Summary: Realm to op-sqlite + Drizzle ORM Migration (#1846)

Branch: `spike/realm-to-op-sqlite-drizzle`

## What Was Achieved

Across **15 commits**, **27 files**, and **~29,700 lines**, this spike built a **fully working prototype** that replaces Realm with op-sqlite as the local database engine. The app can complete full end-to-end flows — **sync, dashboard rendering, registration, enrolment, encounters, and push sync** — using SQLite as the sole database backend, with a single boolean flag (`USE_SQLITE = true` in `RealmFactory.js`) to switch between backends.

### Core deliverables

| Component | File | Lines | Purpose |
|---|---|---|---|
| **SqliteProxy** | `SqliteProxy.js` | ~435 | Drop-in replacement for RealmProxy — `objects()`, `create()`, `write()`, `delete()`, `objectForPrimaryKey()` |
| **SqliteResultsProxy** | `SqliteResultsProxy.js` | ~479 | Lazy query builder with chainable `.filtered()`, `.sorted()`, collection API (`map`, `forEach`, `length`, `[index]`) |
| **EntityHydrator** | `EntityHydrator.js` | ~641 | Converts flat SQL rows to nested entity objects (FK resolution, JSON parsing, list attachment) |
| **RealmQueryParser** | `RealmQueryParser.js` | ~823 | Full tokenizer + recursive descent parser + SQL generator — translates Realm queries to SQL WHERE + JOINs |
| **JsFallbackFilterEvaluator** | `JsFallbackFilterEvaluator.js` | ~616 | Post-hydration JS evaluator for SUBQUERY, TRUEPREDICATE DISTINCT, @count/@size, ANY |
| **DrizzleSchemaGenerator** | `DrizzleSchemaGenerator.js` | ~319 | Converts Realm schema definitions to `CREATE TABLE` DDL, FK constraints, indexes |
| **SqliteFactory** | `SqliteFactory.js` | ~120 | Database creation, WAL mode, FK pragma, table creation, Settings seed |

### Test coverage: 6 test suites, ~140+ tests

- `RealmQueryParserTest.js` — 28 tests
- `EntityHydratorTest.js` — 14 tests
- `JsFallbackFilterEvaluatorTest.js` — ~40+ tests
- `SqliteResultsProxyTest.js` — 35 tests
- `SqliteResultsProxyFallbackTest.js` — 12 tests
- `DrizzleSchemaGeneratorTest.js` — 12 tests

---

## Model Reuse: Zero Changes Needed to openchs-models

A key finding of this spike is that **all 80+ model classes in `openchs-models` work unchanged with SQLite**. No patches, forks, or modifications to the models package are required.

### Why models are backend-agnostic

The models never import or use Realm directly. They access data exclusively through `PersistedObject.that` — a plain JS object set in the constructor:

```js
// PersistedObject.js — the base class for all 80+ models
class PersistedObject {
  constructor(that) {
    this.that = _.isNil(that) ? {} : that;
  }

  // Wraps a nested object reference in an entity class
  toEntity(property, entityClass) {
    const propertyValue = this.that[property];
    if (_.isNil(propertyValue)) return null;
    return new entityClass(propertyValue);
  }

  // Wraps a list property in a RealmListProxy
  toEntityList(property, listItemClass) {
    const realmList = this.that[property];
    if (realmList) {
      const realmListProxy = new RealmListProxy(realmList);
      realmListProxy.pushAll(listItemClass);
      return realmListProxy;
    }
    return null;
  }
}
```

Model getters are pure wrappers over `this.that`:

```js
// Individual.js — just reads from this.that, no Realm dependency
get subjectType() { return this.toEntity("subjectType", SubjectType); }
get enrolments() { return this.toEntityList("enrolments", ProgramEnrolment); }
```

### RealmListProxy already works with plain JS arrays

`RealmListProxy` extends `Array` and wraps a backing "realmList" for write-through. Its constructor only calls `realmList.forEach()` — which works identically on both Realm lists and plain JS arrays:

```js
class RealmListProxy extends Array {
  constructor(realmList) {
    super();
    this.realmList = realmList; // Can be a Realm list OR a plain JS array
  }

  pushAll(listItemClass) {
    this.realmList.forEach(x => super.push(new listItemClass(x))); // forEach works on both
  }

  push(...values) {
    super.push(...values);
    values.forEach(x => this.realmList.push(x.that)); // push() works on both
  }

  // pop(), shift(), splice(), unshift() — all use standard Array methods that work on plain arrays
}
```

The spike initially created a `patches/openchs-models+1.33.25.patch` to bypass `RealmListProxy` for plain arrays. This was **reverted** (commit `923739afb`) because it was unnecessary and harmful — bypassing `RealmListProxy` lost the write-through to the backing `this.that[property]` array, breaking list mutations like `concept.addAnswer()` and causing 15 test failures.

### What the EntityHydrator must produce

For models to work unchanged, the `EntityHydrator` produces plain JS objects matching the shape models expect for `this.that`:

| Model expectation | What EntityHydrator provides |
|---|---|
| Scalar properties directly on `this.that` | Type-converted values (epoch ms → Date, 0/1 → boolean, etc.) |
| FK references as nested objects (`this.that.gender`) | Full hydrated objects resolved from cache or DB query |
| Embedded objects (`this.that.registrationLocation`) | JSON-parsed objects with nested FK references resolved |
| List properties as arrays (`this.that.encounters`) | Arrays of hydrated objects queried from child tables via reverse FK |

### The only Realm import remaining in the service layer

16 service files import `Realm` directly for `Realm.UpdateMode.Modified`. This is handled by `SqliteProxy.create()` accepting both Realm-style update modes and booleans — so these imports work but are unnecessary coupling. This is a minor cleanup item for production.

---

## Architecture: How It Works

### Query handling: Hybrid SQL + JS fallback

The 135+ `.filtered()` calls across the codebase are handled in three tiers:

1. **~80% — SQL translation**: Simple comparisons (`voided = false`, `uuid = $0`), AND/OR/NOT, string ops (CONTAINS, BEGINSWITH, ENDSWITH, LIKE with `[c]` case-insensitive), null comparisons, parameterized bindings
2. **~15% — SQL JOINs via dot-notation**: `individual.subjectType.uuid = $0` → generates `LEFT JOIN` chains resolved from Realm schema definitions, with automatic `SELECT DISTINCT` when JOINs are present
3. **~5% — JS fallback**: `SUBQUERY(...)`, `TRUEPREDICATE DISTINCT(...)`, `@count`/`@size`, `ANY`, `@links.@count` — evaluated post-hydration in JavaScript

**Partial parsing**: When a query mixes SQL-translatable and JS-fallback clauses (e.g., `voided = false AND SUBQUERY(...).@count > 0`), the parser splits on top-level AND — translatable parts go to SQL, unsupported parts to JS. This lets the database do the heavy lifting.

### Schema generation

The `DrizzleSchemaGenerator` reads Realm `schema` static properties from all model classes and produces `CREATE TABLE` DDL:

| Realm Type | SQLite Type | Notes |
|---|---|---|
| `string` | `TEXT` | |
| `bool` | `INTEGER` | 0/1 |
| `int` | `INTEGER` | |
| `float`/`double` | `REAL` | |
| `date` | `INTEGER` | Epoch milliseconds |
| `decimal128` | `TEXT` | Preserve precision |
| Object reference (with PK) | `TEXT` FK column | e.g., `gender_uuid` references `gender(uuid)` |
| Object reference (embedded) | `TEXT` | JSON-serialized |
| List of embedded | `TEXT` | JSON array on parent |
| List of referenced (with PK) | Skipped | FK lives on child table |

**Embedded schemas** (stored as JSON, no separate table): Observation, Point, SubjectLocation, KeyValue, EmbeddedKeyValue, Format, EmbeddedFormat, ChecklistItemStatus, EmbeddedChecklistItemStatus, StringKeyNumericValue, EmbeddedStringKeyNumericValue, ConceptMedia, ReportCardResult, NestedReportCardResult.

Column naming: camelCase → snake_case (`encounterDateTime` → `encounter_date_time`). FK columns: `{property}_uuid` (e.g., `gender` → `gender_uuid`). Indexes on all FK columns, `voided` columns, and `entity_sync_status.entity_name`.

### Realm query parser

Three-stage pipeline:
1. **Tokenizer** → STRING, NUMBER, BOOLEAN, NULL, IDENTIFIER, PARAMETER, COMPARISON, STRING_OP, AND, OR, NOT, LPAREN, RPAREN
2. **Recursive descent parser** → AST with AND, OR, NOT, COMPARISON, STRING_OP nodes
3. **SQL generator** → walks AST producing WHERE clauses, resolving dot-notation via JOINs

Dot-notation example: `individual.subjectType.uuid = $0` generates:
```sql
LEFT JOIN individual AS t1 ON t0."individual_uuid" = t1."uuid"
LEFT JOIN subject_type AS t2 ON t1."subject_type_uuid" = t2."uuid"
WHERE t2."uuid" = ?
```

List property JOINs (reverse FK): `encounters.encounterType.uuid = $0` generates:
```sql
LEFT JOIN encounter AS t1 ON t1."individual_uuid" = t0."uuid"
LEFT JOIN encounter_type AS t2 ON t1."encounter_type_uuid" = t2."uuid"
```

An `aliasOffset` parameter prevents alias collisions when chaining multiple `.filtered()` calls.

### JS fallback filter evaluator

Operates on already-hydrated entity objects for patterns that can't be translated to SQL:

| Pattern | Handling |
|---|---|
| `TRUEPREDICATE DISTINCT(field)` | Dedup by unique field value, supports embedded `SORT(field dir)` |
| `SUBQUERY(listProp, $var, conditions).@count OP N` | Evaluates conditions against each list item |
| `listProp.@count` / `@size` | `Array.isArray(list) ? list.length : 0` |
| `ANY listProp.field OP value` | Checks if any list element matches |
| `@links.@count` | Returns empty array (conservative) |
| `limit(N)` | Applied after JS filtering when combined with other fallback filters |

---

## Caching and Hydration Design

### Three-layer caching system

| Layer | Scope | Contents | Purpose |
|---|---|---|---|
| **Reference Data Cache** | Persistent (rebuilt after sync) | Full tables of reference entities | Eliminates repeated `SELECT * WHERE uuid = ?` during FK resolution |
| **Session Hydration Cache** | Per query execution | Already-hydrated entities keyed by `schema:uuid` | Handles circular back-references (e.g., `ProgramEnrolment.individual` → already-hydrated `Individual`) |
| **List Batch Cache** | Per query execution | Batch-loaded child entities | Eliminates N+1 queries — one `WHERE ... IN (?)` per list property instead of N individual SELECTs |

### Reference data cache (persistent, post-sync)

Built in `SyncService._buildReferenceCacheIfSqlite()` with deliberate ordering — earlier caches are used to resolve FKs when hydrating later ones:

```
Step 1 (depth 1, skipLists): Gender, SubjectType, Program, EncounterType,
        OrganisationConfig, IndividualRelation, IndividualRelationGenderMapping,
        IndividualRelationshipType, GroupRole

Step 2 (depth 2, with lists): Concept — needs ConceptAnswer list populated

Step 3 (depth 1, with lists): ChecklistItemDetail — stateConfig embedded, form FK from cache

Step 4 (depth 3, with lists): Form → FormElementGroups → FormElements → concept from Concept cache
```

Order matters: Concept is cached before Form so `FormElement.concept` resolves from the Concept cache during Form hydration. Large entities (AddressLevel, FormElement, ConceptAnswer, LocationMapping) are NOT cached — they resolve via depth-0 DB queries with session caching.

### Hydration depth control

Prevents infinite recursion from circular references (e.g., `Individual.enrolments[].individual`):

- **Depth 3**: Default for `objectForPrimaryKey()` and query execution
- **Depth 0**: At the deepest level, `_resolveCachedReference()` resolves from reference data cache or session hydration cache first, then falls back to a depth-0 DB query (scalar fields only)

### Session hydration cache lifecycle

```
beginHydrationSession()     ← creates empty Map + list batch cache
  ├── hydrate entity A      ← caches A by "Schema:uuid"
  ├── hydrate entity B      ← B.fkToA resolves from cache (no re-query)
  └── hydrate entity C      ← C.backRefToA resolves from cache (no recursion)
endHydrationSession()       ← clears both session caches
```

### List batch loading

Before hydrating N entities, a single `WHERE parent_uuid IN (uuid1, uuid2, ..., uuidN)` query per list property replaces N individual `SELECT` queries:

- **Before optimization**: 1000 Individuals × 5 list properties = ~5000 individual SELECT queries (~2-4s)
- **After optimization**: 5 batch IN queries (~200-500ms)

### Flatten (write path)

`EntityHydrator.flatten()` reverses hydration for SQL INSERTs:
- Nested objects → FK UUID values (`{uuid: "abc"}` → `gender_uuid = "abc"`)
- Embedded objects → JSON via schema-aware `flattenEmbedded()` (avoids cyclical structures)
- Dates → epoch ms, booleans → 0/1
- List properties → skipped (FK lives on child table)
- Dummy FK UUIDs (e.g., `Individual.getAddressLevelDummyUUID()`) → nullified to avoid FK violations

---

## Key Findings & Lessons Learned

### 1. Models are fully reusable (see section above)

The `PersistedObject.that` + `RealmListProxy` abstraction was already backend-agnostic. The EntityHydrator just needs to produce plain JS objects in the expected shape. **Zero changes to openchs-models.**

### 2. Realm "live objects" don't exist in SQLite

**Realm**: Mutating properties inside `db.write()` auto-persists. **SQLite**: Entities are plain JS objects — mutations are lost unless explicitly saved with `db.create()`.

Affected services identified during spike: `DashboardCacheService`, `CustomDashboardCacheService`, `TaskUnAssignmentService`, `IndividualRelationshipService`. Each needed explicit `db.create(schema, entity, true)` after mutations.

### 3. op-sqlite v11's `execute()` is async

The entire Realm API contract is synchronous. The spike uses `db.executeSync()` exclusively. This is a hard constraint — the service layer cannot be made async without a massive rewrite.

### 4. Drizzle ORM is included but not used for queries

Drizzle is a dependency but the spike generates raw DDL and raw SQL queries because schemas are dynamic (loaded at runtime from `EntityMappingConfig`). Drizzle's `sqliteTable()` expects static schema definitions.

### 5. FK enforcement is now ON

Final commit enabled `PRAGMA foreign_keys = ON` and nullifies dummy FK UUIDs during flatten to avoid constraint violations. `SqliteProxy.create()` includes FK constraint failure diagnostics — logs which specific FK is missing.

### 6. Entities without primary key need special handling

`EntityQueue` and `BeneficiaryModePin` have no `uuid` PK. `SqliteProxy.delete()` handles these by building WHERE from all column values. `SqliteProxy.create()` defaults PK to "uuid" for upsert — only safe if these schemas always use `save()` (not `saveOrUpdate()`).

### 7. SELECT DISTINCT with JOINs

Realm `.filtered()` returns unique objects; SQL JOINs can duplicate parent rows (e.g., an Individual appearing N times for N ProgramEnrolments). `SqliteResultsProxy` automatically adds `SELECT DISTINCT` when JOINs are present.

### 8. LIMIT safety with JS fallback

`LIMIT` is only pushed to SQL when there are no JS fallback filters. If JS fallbacks exist, they need the full result set first, then `.slice(0, N)` is applied after JS filtering.

---

## Performance

| Scenario | Realm | SQLite (optimized) | Delta |
|---|---|---|---|
| Simple filter (`voided=false`) | ~50ms | ~80ms | +60% |
| DISTINCT on 1000 rows | ~60ms | ~250ms | +300% |
| SUBQUERY on 1000 rows | ~80ms | ~300ms | +275% |
| `limit(1)` on large table | ~5ms | ~5ms | ~0% |

The bottleneck is hydration (FK resolution + list loading), not SQL execution or JS fallback (~2-10ms). Batch loading was the single biggest performance win (5000 → 5 queries for 1000 entities).

---

## Key Decisions Needed for Production Implementation

### 1. Drizzle ORM: Keep or remove?

Drizzle is a runtime dependency (~200KB) but only used for schema metadata, not for query building. Options:
- **Keep** for potential future use (type-safe queries, migrations)
- **Remove** and generate raw DDL directly (spike already does this)
- **Use only drizzle-kit** for migration management

### 2. Data migration strategy

The spike starts with an empty SQLite database. Production needs to migrate existing Realm data. Options:
- **Full re-sync**: Delete local data, run a fresh sync from the server (simplest, but slow on large datasets and requires connectivity)
- **Realm → SQLite migration tool**: Read from Realm, write to SQLite in a one-time migration (complex, requires maintaining Realm dependency temporarily)
- **Server-side flag**: Server marks client for re-sync after migration

### 3. Live object mutation pattern

Should production code:
- **Option A**: Add explicit `db.create()` calls everywhere mutations happen (high audit effort across 77 services, error-prone)
- **Option B**: Build a mutation-tracking proxy that auto-persists on `db.write()` completion (closer to Realm semantics, more complex)
- **Option C**: Refactor all mutate-and-save patterns to always call `saveOrUpdate()` explicitly (cleanest, biggest code change)

### 4. JS fallback patterns: Rewrite to SQL or keep as JS?

The ~24 advanced Realm queries (SUBQUERY, TRUEPREDICATE DISTINCT) currently use JS fallback. For production:
- **SUBQUERY** → could be rewritten as SQL `EXISTS (SELECT 1 FROM ... WHERE ...)` — worth doing for performance
- **TRUEPREDICATE DISTINCT** → SQL `SELECT DISTINCT` on the relevant field — straightforward
- **@count/@size** → SQL `(SELECT COUNT(*) FROM child WHERE ...)` — straightforward
- **ANY** → SQL `EXISTS (SELECT 1 FROM child WHERE ...)` — straightforward
- Estimated effort: medium, but would eliminate the JS fallback layer entirely

### 5. Encryption approach

The spike converts Realm's 64-byte `Uint8Array` key to a hex string for SQLCipher. Production needs to decide:
- Is SQLCipher encryption sufficient? (It encrypts at rest, same as Realm)
- Key derivation: continue using the existing `EncryptionService.getEncryptionKey()` or adopt a new scheme?

### 6. Database backup / `writeCopyTo()`

`SqliteProxy.writeCopyTo()` is not implemented (logs a warning). Needed for DB export/backup features. SQLite's `VACUUM INTO` or file copy can replace Realm's `writeCopyTo()`.

### 7. Performance optimization priorities

If performance is a concern:
- **Batch insert during sync**: Use a single `INSERT INTO ... VALUES (...), (...), (...)` instead of row-by-row
- **Reduce hydration depth**: Many queries only need depth 1 — add query-level depth hints
- **Materialized views**: For dashboard cards that aggregate over large tables
- **FTS (Full-Text Search)**: op-sqlite supports FTS5 — could replace `LIKE '%term%'` searches

### 8. Realm.UpdateMode imports

16 service files import `Realm` directly for `Realm.UpdateMode.Modified`. For production, extract this to a shared constant or make `SqliteProxy.create()` accept a simple boolean/string (which it already does). Minor cleanup item.

---

## What's NOT Covered by This Spike

1. **Data migration from Realm → SQLite** (separate concern)
2. **Schema migration / versioning** for SQLite (Drizzle Kit could handle this)
3. **`writeCopyTo()`** (database backup/export)
4. **`@links.@count`** (inverse relationships — returns empty array, conservative)
5. **Performance benchmarking on real field data** (spike used test server data)
6. **Concurrent access patterns** (WAL mode handles reads-during-write, but no stress testing was done)
7. **Full audit of all `db.write()` blocks** for implicit mutation patterns that need explicit `db.create()`

---

## Commit History

```
59dcb24cf  Spike: Add op-sqlite + Drizzle ORM database layer as Realm replacement
923739afb  Fix chained .filtered() JOIN alias collisions and remove broken openchs-models patch
abf77fc58  Bust CI node_modules cache to pick up removed openchs-models patch
4efdd4012  Fix multiple SQLite proxy issues found during spike testing
2e1b68800  Fix SQLite proxy hydration, query parsing, and dedup issues
2dba44595  Sort package.json dependencies alphabetically
5eb4e410a  Add JS fallback filter evaluator for unsupported Realm queries with tests
f2627c795  Add @size, ANY, limit() JS fallback handlers and rename UNSUPPORTED_PATTERNS
884d84e5a  Add batch list loading, SQL LIMIT propagation, and performance analysis
285531d7c  Use db.create() instead of saveOrUpdate() inside db.write() to fix auto-persist for SQLite mode
0e8844f5d  Revert db.create() in CustomDashboardCacheService methods with embedded list mutations
d3fa49d05  Fix SQLite proxy: cyclical JSON in flatten, search results, and list property JOINs
7e9acfa46  Fix hydration depth, embedded FK resolution, dashboard cache persistence, and embedded schema completeness
c94094140  Add post-sync reference data cache with per-schema depth config and batch preloading
a9bb911eb  Enable SQLite FK enforcement, nullify dummy FK UUIDs during flatten
```

---

## Key Files Reference

| Category | Path |
|---|---|
| Core proxy | `src/framework/db/SqliteProxy.js`, `SqliteResultsProxy.js` |
| Hydration | `src/framework/db/EntityHydrator.js` |
| Query parsing | `src/framework/db/RealmQueryParser.js` |
| JS fallback | `src/framework/db/JsFallbackFilterEvaluator.js` |
| Schema generation | `src/framework/db/DrizzleSchemaGenerator.js` |
| DB factory | `src/framework/db/SqliteFactory.js` |
| Backend switch | `src/framework/db/RealmFactory.js` (`USE_SQLITE` flag) |
| Reference cache setup | `src/service/SyncService.js` (`_buildReferenceCacheIfSqlite()`) |
| Performance docs | `docs/performance-analysis-js-fallback.md` |
| SQLite DB on device | `/data/data/com.openchsclient/databases/avni_sqlite.db` |
