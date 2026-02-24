# Spike Plan: Migrate from Realm to op-sqlite + Drizzle ORM

## Context

MongoDB Realm (v12.14.2) is end-of-life with minimal support. To keep the app sustainable, we need to migrate to **op-sqlite + Drizzle ORM**. This spike aims to uncover issues and roadblocks by building a working prototype of core flows using op-sqlite, without considering data migration from Realm (that will be handled separately via a new database interface).

The codebase has:
- **80+ model classes** in `openchs-models` npm package, each with Realm-format `schema` static property
- **77 service classes** extending `BaseService`, all using `this.db` (a `RealmProxy` instance)
- **135+ `.filtered()` calls** using Realm query syntax across 30 service files
- **~24 advanced Realm queries** using `SUBQUERY`, `TRUEPREDICATE DISTINCT`, `@links.@count`
- **`PersistedObject.that`** pattern: all models wrap their backing store object

---

## Part 1: Model Reuse Assessment

### Finding: Models CAN be reused

Models don't import or use Realm directly. They access data through `this.that` (set in `PersistedObject` constructor). Example:

```js
// Individual.js getter - just reads from this.that
get subjectType() { return this.toEntity("subjectType", SubjectType); }

// PersistedObject.toEntity - wraps nested object in entity class
toEntity(property, entityClass) {
    return new entityClass(this.that[property]);
}
```

**Requirement**: `this.that` must be a plain JS object with the expected shape:
- Scalar properties directly on it
- Object references as nested objects (not just foreign key UUIDs)
- List properties as arrays of objects

### Changes needed in `openchs-models` (via patch-package)

1. **`PersistedObject.toEntityList()`** (`node_modules/openchs-models/dist/PersistedObject.js:15-22`)
   - Currently always wraps in `RealmListProxy(realmList)`, which calls `realmList.forEach()`
   - For SQLite, `this.that[property]` will be a plain JS array, not a Realm list
   - **Fix**: Check if the value is already a plain array; if so, wrap items directly without `RealmListProxy`

2. **`Realm.UpdateMode.Modified`** — used in 16 places across services
   - Services import `Realm` directly for `Realm.UpdateMode.Modified`
   - **Fix**: `SqliteProxy.create()` should accept both Realm-style update modes (`"never"`, `"modified"`, `true`) and the `Realm.UpdateMode` enum. Map them to `INSERT OR REPLACE` / `INSERT OR IGNORE`.

---

## Part 2: Realm-to-SQLite Type Mapping

| Realm Type | Drizzle/SQLite Type | Notes |
|---|---|---|
| `"string"` | `text()` | |
| `"bool"` | `integer({ mode: 'boolean' })` | SQLite stores as 0/1 |
| `"int"` | `integer()` | |
| `"float"` / `"double"` | `real()` | |
| `"date"` | `integer()` | Store as epoch milliseconds |
| `"decimal128"` | `text()` | Preserve precision |
| `{ type: 'object', objectType: X }` (with PK) | `text('x_uuid')` + FK reference | Foreign key to related table |
| `{ type: 'object', objectType: X }` (embedded) | `text()` | JSON-serialized (Point, Format, etc.) |
| `{ type: 'list', objectType: 'Observation' }` | `text()` | JSON array on parent — observations are key-value JSON already |
| `{ type: 'list', objectType: X }` (non-embedded, with PK) | FK on child table | No join table needed; query `SELECT * FROM x WHERE parent_uuid = ?` |

### Embedded vs. Referenced determination
- **Embedded** (no primary key, stored as JSON): `Observation`, `Point`, `SubjectLocation`, `KeyValue`, `Format`, `ChecklistItemStatus`, `StringKeyNumericValue`, `ConceptMedia`
- **Referenced** (has `uuid` PK, separate table with FK): `Individual`, `ProgramEnrolment`, `Encounter`, `Concept`, `SubjectType`, etc.

### Observations storage
Observations are already semi-JSON: `{ concept: Concept, valueJSON: "string" }`. In SQLite, store as a JSON text column on the parent:
```json
[{"conceptUUID": "abc-123", "valueJSON": "{\"answer\": \"def-456\"}"}]
```
Single/multi-select work through `valueJSON` parsing in `Observation.getValueWrapper()` — pure JS, no changes needed.

---

## Part 3: Architecture — New Database Abstraction Layer

### 3.1 Core interfaces to implement

**`SqliteProxy`** — must match `RealmProxy` contract (`node_modules/openchs-models/dist/framework/RealmProxy.js`):
- `objects(schemaName)` → returns `SqliteResultsProxy`
- `create(schemaName, object, updateMode)` → INSERT/UPSERT, returns wrapped entity
- `write(callback)` → wraps in transaction
- `delete(objectOrObjects)` → DELETE by uuid
- `objectForPrimaryKey(type, key)` → SELECT by PK
- `isInTransaction`, `close()`, `schemaVersion`

**`SqliteResultsProxy`** — must match `RealmResultsProxy` API (`node_modules/openchs-models/dist/framework/RealmResultsProxy.js`):
- `filtered(query, ...args)` → returns new `SqliteResultsProxy` (chainable)
- `sorted(descriptor, reverse?)` → returns new `SqliteResultsProxy`
- `map()`, `forEach()`, `filter()`, `find()`, `some()`, `every()`, `slice()`
- `length` (via Proxy handler), `[index]` access (via Proxy handler)
- `isEmpty()`, `max(prop)`, `min(prop)`, `sum(prop)`

### 3.2 Query handling strategy

**For the spike: Hybrid approach**

1. **Simple queries** (`voided = false`, `uuid = $0`, `name = "value"`, AND/OR combinations): Build a lightweight **Realm query parser** that translates to SQL WHERE clauses. This covers ~80% of the 135 `.filtered()` calls.

2. **Dot-notation queries** (`individual.uuid = $0`, `programEnrolment.individual.lowestAddressLevel.uuid`): Translate to SQL JOINs. The parser resolves dot paths using Realm schema definitions to determine the join chain.

3. **Advanced Realm-specific queries** (SUBQUERY, TRUEPREDICATE DISTINCT, @links.@count — ~24 occurrences): For the spike, fall back to **eager load + JS filtering** for these specific cases. Flag them for production-grade SQL rewriting later.

### 3.3 Entity hydration

When loading from SQLite, flat rows need conversion to nested objects matching the `this.that` shape:
- FK columns (e.g., `subject_type_uuid`) → resolve to full nested object via a lookup/cache
- JSON columns (observations, embedded objects) → parse and nest
- List properties → query child table and attach as arrays

**For reference data** (Concepts, SubjectTypes, etc.): Cache in memory after sync since they're read-only and small. Hydration resolves FKs from this cache.

### 3.4 Relationship handling for writes

**Realm**: `individual.addEncounter(encounter)` mutates the parent's list, then parent is saved with `db.create()`.
**SQLite**: The FK lives on the child (`encounter.individual_uuid`). Saving the parent should **ignore list properties** — they're derived from child table FKs.

The `SqliteProxy.create()` must:
1. Extract FK UUIDs from nested object references (e.g., `entity.individual` → `individual_uuid = entity.individual.uuid`)
2. Serialize embedded objects/observations to JSON
3. Skip list-type properties (they're managed by the child table)
4. Execute `INSERT OR REPLACE`

---

## Part 4: Implementation Steps

### Step 1: Install dependencies
- `@op-engineering/op-sqlite` — SQLite engine for React Native
- `drizzle-orm` — TypeScript ORM for SQLite
- `drizzle-kit` — schema tooling (dev dependency)

### Step 2: Schema generator (`src/framework/db/DrizzleSchemaGenerator.js`)
- Read all entity `schema` definitions from `EntityMappingConfig`
- Convert each to a Drizzle `sqliteTable()` definition using the type mapping from Part 2
- Handle: primary keys, foreign keys, optional fields, defaults, embedded-as-JSON
- Output: Drizzle schema object keyed by schema name
- **Verify**: Generate schemas for all 80+ entities, compare column counts with Realm schemas

### Step 3: SQLite factory (`src/framework/db/SqliteFactory.js`)
- Create op-sqlite database instance (with encryption via op-sqlite's built-in SQLCipher support)
- Initialize Drizzle ORM with generated schemas
- Run Drizzle migrations to create tables
- Return `SqliteProxy` instance

### Step 4: Realm query parser (`src/framework/db/RealmQueryParser.js`)
- Parse Realm query strings into an AST
- Support: `=`, `!=`, `<>`, `<`, `>`, `<=`, `>=`, `CONTAINS`, `BEGINSWITH`, `ENDSWITH`, `LIKE`
- Support: `AND`, `OR`, `NOT`, parentheses, `$0`-`$N` parameter substitution
- Support: dot-notation paths → generate JOINs
- Support: `null` comparison
- Output: SQL WHERE clause + parameter bindings
- Flag unsupported patterns (SUBQUERY, TRUEPREDICATE, @count) for JS fallback

### Step 5: SqliteProxy (`src/framework/db/SqliteProxy.js`)
- Implement `DatabaseProxy` interface using Drizzle
- `objects()` → create `SqliteResultsProxy` with table ref
- `create()` → flatten entity, extract FKs, serialize JSON, INSERT/UPSERT
- `write()` → Drizzle transaction wrapper
- `delete()` → DELETE by uuid

### Step 6: SqliteResultsProxy (`src/framework/db/SqliteResultsProxy.js`)
- Lazy query builder: accumulate filter/sort criteria, execute on first data access
- `filtered()` → pass through RealmQueryParser for SQL WHERE, or flag for JS fallback
- `sorted()` → add ORDER BY clause
- Collection methods (`map`, `forEach`, `length`, `[index]`) → execute query, cache results, wrap in entity classes
- Use JS Proxy handler for `[index]` and `.length` access (same pattern as `RealmResultsProxyHandler`)

### Step 7: Entity hydrator (`src/framework/db/EntityHydrator.js`)
- Convert flat SQL rows to nested objects
- Resolve FK columns to full objects (from reference data cache or DB lookup)
- Parse JSON columns back to objects
- Attach list properties by querying child tables

### Step 8: Patch `PersistedObject.toEntityList()`
- via `patches/openchs-models+1.33.25.patch` (add to existing patches)
- If `this.that[property]` is a plain Array (not a Realm list), wrap items in entity class directly

### Step 9: Wire up to app initialization
- Add config flag to select database backend (Realm vs SQLite)
- Modify `RealmFactory.createRealm()` to conditionally return `SqliteProxy`
- Ensure `BeanRegistry` / service context passes the chosen proxy to all services

### Step 10: Adapt sync for SQLite
- `SyncService.persistAll()` calls `db.create()` — works if `SqliteProxy.create()` contract matches
- `fromResource()` uses `entityService.findByKey()` — works through the service layer
- `EntityQueue` — ensure this table exists in SQLite for change tracking
- `MediaQueueService` — ensure media queue operations work with SQLite
- `EntitySyncStatus` — sync status tracking table in SQLite

---

## Part 5: Entities in Scope for Spike

### Must-have for spike flows (registration, enrolment, encounter, sync, dashboard, observations):

**Transaction entities** (read/write):
Individual, ProgramEnrolment, ProgramEncounter, Encounter, EntityQueue, EntitySyncStatus, SyncTelemetry, MediaQueue, GroupSubject

**Reference entities** (sync-downloaded, read-only locally):
SubjectType, Program, EncounterType, Gender, AddressLevel, LocationMapping, Form, FormMapping, FormElement, FormElementGroup, Concept, ConceptAnswer, Dashboard, DashboardSection, DashboardSectionCardMapping, ReportCard, StandardReportCardType, GroupDashboard, GroupRole, Groups, MyGroups, GroupPrivileges, Privilege, Settings, UserInfo, OrganisationConfig, Rule, RuleDependency

**Embedded as JSON** (no separate table):
Observation, Point, SubjectLocation, KeyValue, Format

---

## Part 6: Key Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Realm query translation** — 135+ `.filtered()` calls with varying complexity | High | Parser handles ~80% common patterns; JS fallback for advanced (SUBQUERY, TRUEPREDICATE) |
| **Performance of eager loading** — JS filtering defeats SQLite's speed | Medium | Acceptable for spike; production needs full SQL WHERE translation |
| **`openchs-models` is external npm** — modifying requires patches or fork | Medium | Use patch-package for spike; plan a models package version with dual-backend support |
| **Dot-notation relationship traversal in queries** — 3+ levels deep in some queries | High | Parser generates JOIN chains from schema definitions; test with deepest queries found |
| **SUBQUERY and TRUEPREDICATE DISTINCT** — 24 occurrences, Realm-only features | Medium | For spike, implement as raw SQL or JS post-processing; these are in dashboard/report/approval flows |
| **RealmListProxy mutations** — `push()`, `splice()` sync both array and Realm list | Medium | For SQLite, list mutations save child entities directly via SqliteProxy.create() |
| **Encryption** — Realm has built-in encryption; need equivalent for SQLite | Low | op-sqlite supports SQLCipher for encryption |
| **Transaction semantics** — Realm has implicit transactions; SQLite needs explicit | Low | SqliteProxy.write() wraps in explicit transaction |

---

## Part 7: Verification Plan

1. **Schema generation**: Generate Drizzle schemas for all 80+ entities. Verify column counts, types, and FK relationships match Realm schemas.

2. **Fresh sync**: Point at a test server. Run full sync. Verify all reference and transaction data lands in SQLite tables with correct data.

3. **Custom dashboard**: Open dashboard after sync. Verify cards render with correct counts. Test standard report cards and cards with custom queries.

4. **Registration**: Register an individual (person type) and a group subject. Verify:
   - Data persisted in SQLite `individual` table
   - `entity_queue` entry created
   - Observations (single-select, multi-select) stored correctly in JSON
   - Group membership stored in `group_subject` table

5. **Program enrolment**: Enrol the registered individual. Verify `program_enrolment` record with FK to individual.

6. **Encounter**: Create an encounter with observations. Verify `encounter` record with FK to individual.

7. **Push sync**: Trigger sync. Verify:
   - `EntityQueue` items picked up and sent to server
   - `MediaQueue` items uploaded (if any media observations)
   - Server receives correct data

8. **Round-trip**: Sync data created on server back to the device. Verify it appears correctly in SQLite and renders in the app.

---

## Part 8: Files to Create / Modify

### New files
| File | Purpose |
|---|---|
| `src/framework/db/SqliteFactory.js` | Create op-sqlite + Drizzle instance |
| `src/framework/db/SqliteProxy.js` | Implements DatabaseProxy interface |
| `src/framework/db/SqliteResultsProxy.js` | Query results with filtered/sorted/collection API |
| `src/framework/db/RealmQueryParser.js` | Translates Realm query strings to SQL |
| `src/framework/db/DrizzleSchemaGenerator.js` | Converts Realm schemas to Drizzle tables |
| `src/framework/db/EntityHydrator.js` | Converts flat SQL rows to nested entity objects |

### Files to modify
| File | Change |
|---|---|
| `package.json` | Add op-sqlite, drizzle-orm, drizzle-kit deps |
| `patches/openchs-models+1.33.25.patch` | Patch PersistedObject.toEntityList() for plain arrays |
| `src/framework/db/RealmFactory.js` | Conditional: return SqliteProxy when configured |
| Services using `Realm.UpdateMode.Modified` (16 places) | Import update mode constant from a shared module instead of Realm directly |

### Critical reference files (read-only, for understanding)
| File | Why |
|---|---|
| `node_modules/openchs-models/dist/framework/RealmProxy.js` | Interface contract to replicate |
| `node_modules/openchs-models/dist/framework/RealmResultsProxy.js` | Query results API to replicate |
| `node_modules/openchs-models/dist/PersistedObject.js` | `this.that` pattern, `toEntity()`, `toEntityList()` |
| `node_modules/openchs-models/dist/Schema.js` | EntityMappingConfig, all entity registrations |
| `src/service/BaseService.js` | Service base class — validates interface abstraction |
| `src/service/SyncService.js` | Sync flow — persistAll, pushData |
| `src/service/IndividualService.js` | Most complex service, 27 filtered() calls |
