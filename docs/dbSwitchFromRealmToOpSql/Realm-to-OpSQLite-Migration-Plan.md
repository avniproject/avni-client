# Realm to op-sqlite + Drizzle Migration Plan

## Context

Realm community package hasn't been published in 6+ months (last: Aug 2025). Before RN 0.77/0.78 or Android 16 breaks Realm, we need to migrate. After evaluating WatermelonDB, expo-sqlite, and op-sqlite, **op-sqlite + Drizzle ORM** was chosen for its faster retrieval and active maintenance. The migration uses **fresh sync per org** (no on-device Realm-to-SQLite data transfer) and a **repository-first approach** (abstract DB access behind repository layer on Realm, then swap to op-sqlite).

## Key Architecture Facts

**Codebase Structure** (from skill analysis):
- **avni-client**: 556 JavaScript files, 10 Java files
  - Architecture: MVC (90% confidence) + Service Layer (75% confidence) + 2-tier Layered (85% confidence)
  - Design Patterns: 88 Factory instances, 3 Strategy, 2 Observer
- **avni-models** (openchs-models): 166 JavaScript files, 12 TypeScript files
  - 86 schemas (validated with Realm v12)
  - 1.4M+ observations migrated successfully in Realm v12 upgrade
  - Factory pattern: 19 instances
  - Custom RealmProxy wrappers for entity instantiation

**Database Layer**:
- **89 service files** all extend `BaseService` which holds `this.db` (a `RealmProxy`)
- **~90 schemas** defined in external `openchs-models` package (schema version 203)
- **59+ files** use `.filtered()` with Realm query syntax (SUBQUERY, TRUEPREDICATE DISTINCT, relationship traversal)
- **Rules engine** passes raw `db` to custom JavaScript rules via `getCommonParams()` in [RuleEvaluationService.js:1083-1084](packages/openchs-android/src/service/RuleEvaluationService.js#L1083-L1084)
- **Dashboard report cards** execute `eval(reportCard.query)` with `db` access at [RuleEvaluationService.js:972](packages/openchs-android/src/service/RuleEvaluationService.js#L972)
- **Sync** uses `Realm.UpdateMode.Modified` for upserts and bulk `db.write()` transactions
- **Encryption** via `EncryptionService` stores 64-byte key in Keychain, uses Realm's `writeCopyTo`

**Critical Migration Insights** (from deep exploration):
- ✅ **NO live queries** - Only 1 `.addListener()` found (keyboard events, not Realm). Code uses **Redux + explicit re-query pattern**
- ✅ **Immediate materialization** - 20+ instances of `.map(_.identity)` and 8+ of `.slice()` convert Realm results to plain arrays
- ✅ **No live collection dependencies** - Repository can return plain arrays/objects (no observable wrapper needed)
- ⚠️ **Embedded objects** - Format, KeyValue, ChecklistItemStatus (v184 migration) need JSON columns or flattening in Drizzle
- ⚠️ **List relationships** - Realm hides foreign keys. Observation is polymorphic (belongs to Individual, Encounter, ProgramEnrolment) - needs discriminator pattern
- ⚠️ **Schema version gap** - Realm v203 doesn't map to Drizzle migrations. Start fresh with Drizzle v1, create Realm import migration

---

## Critical Technical Decisions

### 1. Embedded Objects → Drizzle Mapping

**Realm Embedded** (Format, KeyValue, ChecklistItemStatus, StringKeyNumericValue, Point):
- No uuid/primaryKey, stored inline within parent
- Can't exist independently

**Drizzle Options**:
- **Option A: JSON columns** (✅ Recommended for Phase 0 spike)
  ```typescript
  validFirstNameFormat: text('valid_first_name_format', { mode: 'json' })
    .$type<{ regex: string; descriptionKey: string } | null>()
  ```
  - Pros: Matches Realm behavior, simple migration
  - Cons: Can't index/query embedded fields efficiently

- **Option B: Flattened columns**
  ```typescript
  validFirstNameFormatRegex: text('valid_first_name_format_regex')
  validFirstNameFormatDesc: text('valid_first_name_format_desc')
  ```
  - Pros: Queryable, indexable
  - Cons: Schema bloat for complex embeds (ChecklistItemStatus has 7 fields)

**Decision**: Use JSON columns for Phase 0-2, consider flattening in Phase 3 if query performance is critical.

### 2. Polymorphic Observation Relationships

**Realm**: Observations link to Individual, Encounter, ProgramEnrolment, ProgramEncounter via Realm's internal links (no foreign keys).

**Drizzle** needs explicit foreign keys. **Three options**:

- **Option A: Multiple nullable FKs** (✅ Recommended)
  ```typescript
  observation: sqliteTable('observation', {
    uuid: text('uuid').primaryKey(),
    conceptUuid: text('concept_uuid').notNull(),
    valueJSON: text('value_json').notNull(),
    individualUuid: text('individual_uuid').references(() => individual.uuid),
    encounterUuid: text('encounter_uuid').references(() => encounter.uuid),
    programEnrolmentUuid: text('program_enrolment_uuid').references(() => programEnrolment.uuid),
    programEncounterUuid: text('program_encounter_uuid').references(() => programEncounter.uuid),
  })
  ```
  - Constraint: Exactly one FK must be non-null
  - Add check constraint: `CHECK ((individualUuid IS NOT NULL)::int + (encounterUuid IS NOT NULL)::int + ...) = 1`

- **Option B: Polymorphic table** (observableType, observableUuid columns)
  - Pros: Cleaner schema
  - Cons: Can't use foreign key constraints, loses referential integrity

- **Option C: Separate tables** (individual_observation, encounter_observation, etc.)
  - Pros: Strong typing, referential integrity
  - Cons: Code duplication, complex queries

**Decision**: Option A for referential integrity. Validate in Phase 0 spike.

### 3. Schema Versioning Strategy

**Realm v203** with 193 migrations can't map to Drizzle directly.

**Approach**:
1. **Don't replay Realm migrations** - start Drizzle at v1 with fresh schema
2. **Drizzle Initial Migration**: Create all tables from scratch (based on Realm v203 schema)
3. **Realm Import Migration** (for dev/test): Script to export Realm DB → import to op-sqlite
4. **Production Rollout**: Fresh sync (users sync from server to new op-sqlite DB)
5. **Metadata table**: Store original Realm schema version for reference
   ```sql
   CREATE TABLE migration_metadata (
     key TEXT PRIMARY KEY,
     value TEXT
   );
   INSERT INTO migration_metadata VALUES ('realm_schema_version', '203');
   INSERT INTO migration_metadata VALUES ('migrated_at', CURRENT_TIMESTAMP);
   ```

### 4. Pre-Migration Data Sync Enforcement

**Problem**: Fresh sync loses local-only data (pending uploads, drafts, queued media).

**Solution** (as clarified by user):
- **Block migration** if EntityQueue not empty
- **Force user to sync** all pending data before allowing DB migration
- **UI Flow**:
  1. User logs in → fetch org config → detect DB backend change
  2. Check EntityQueue: `SELECT COUNT(*) FROM EntityQueue WHERE saved = false`
  3. If count > 0: Show modal "Please sync before updating app" with sync button
  4. Block app usage until sync complete
  5. Once EntityQueue empty → proceed with fresh sync migration

**Implementation** in Phase 8.3.

### 5. Rules Engine Backward Compatibility

**Problem**: Rules are server-defined, client-executed. Changing `getCommonParams()` API breaks existing rules.

**Approach**:
- **Phase 5.2**: Introduce `repositories` parameter alongside `db` (not replacing)
  ```javascript
  getCommonParams(excludeDBAccess = false) {
    return excludeDBAccess ? {user, myUserGroups} :
      {db: this.db, repositories: this.repositories, services, user, myUserGroups};
  }
  ```
- **Rules can use** `params.db` (old Realm API, deprecated) OR `params.repositories` (new API)
- **Server-side migration**: Gradual rule updates per org, not atomic
- **Deprecation timeline**: Keep `db` parameter for 6-12 months post-GA rollout
- **Final removal**: Phase 8 after 100% orgs migrated AND all rules updated

### 6. Transaction Semantics Mapping

**Realm**:
- Nested `db.write()` calls flattened to single transaction
- `isInTransaction` prevents double-wrapping
- Auto-commit when write block completes

**SQLite/Drizzle**:
- Nested transactions use SAVEPOINTs
- Manual commit/rollback
- Different isolation levels

**Repository Transaction Manager**:
```typescript
class DrizzleTransactionManager {
  private transactionDepth = 0;

  execute(fn) {
    if (this.transactionDepth > 0) {
      // Already in transaction, use SAVEPOINT
      return this.db.transaction(() => {
        this.transactionDepth++;
        try {
          return fn();
        } finally {
          this.transactionDepth--;
        }
      });
    } else {
      // Start new transaction
      this.transactionDepth = 1;
      try {
        return this.db.transaction(fn);
      } finally {
        this.transactionDepth = 0;
      }
    }
  }

  get isInTransaction() {
    return this.transactionDepth > 0;
  }
}
```

**Validate** in Phase 1.2 + Phase 3.3.

### 7. Standard Test Databases (Phase 7.1)

**Challenge**: Creating 5 diverse, sanitized production databases for testing.

**Process**:
1. **Selection Criteria**:
   - Small org (<500 individuals, for smoke tests)
   - Medium org (1K-5K individuals, typical use case)
   - Large org (10K+ individuals, performance testing)
   - Complex org (heavy observation usage, multiple programs)
   - Edge case org (data integrity issues, complex relationships)

2. **Sanitization Script**:
   ```javascript
   // Anonymize PII
   - firstName, lastName, middleName → faker.name.firstName()
   - phoneNumber → random 10-digit
   - Address details → generic locations
   - Keep structure, UUIDs, relationships, observations (non-PII)
   ```

3. **Dual Format Creation**:
   - Export sanitized Realm DB
   - Migrate to op-sqlite using migration script from Phase 0.4
   - Store both formats in `/test-data/` (git LFS for size)

4. **Documentation**: `/docs/dbSwitchFromRealmToOpSql/StandardTestDatabases.md`
   - Database characteristics (entity counts, complexity)
   - Known edge cases per database
   - Update procedure when schemas evolve

**Timeline**: Week 1 of Phase 7 (blocking for rest of testing).

### 8. Rollback Strategy & UX

**Scenario**: Op-sqlite rollout causes critical issues, org needs to revert to Realm.

**Technical Flow**:
1. **Server-side**: Admin changes org config `databaseBackend: "realm"`
2. **Client detects**: On next app launch, fetch org config
3. **If backend changed** to Realm (from op-sqlite):
   - Detect via `BackendSelector.getCurrentBackend()` vs server config
   - Show modal: "Database update required. Your app will reset and sync fresh data."
   - User confirms → clear op-sqlite DB → initialize Realm → trigger full sync
   - **Data created during op-sqlite period is NOT lost** - it was already synced to server

**Key Constraints**:
- **No rollback of local-only data** - if user created data in op-sqlite and hasn't synced, then rollback happens, that data is lost
- **Mitigation**:
  - **Pre-rollback check**: Similar to pre-migration (Decision #4), check EntityQueue before rollback
  - If pending uploads: force user to sync first (blocking modal)
  - If no pending uploads: proceed with rollback
  - **Don't increase auto-sync frequency** - would overload server
- **UX**: Rollback modal shows: "Database rollback required. You have {count} pending uploads. Please sync before proceeding."

**Rollback Telemetry**:
- Track: org rollback events, user acceptance rate, data sync status pre-rollback
- Alert if many users have pending EntityQueue during rollback

**Implementation**: Phase 8.6 (rollback mechanism).

**Testing**: Simulate rollback in Phase 7.4 (E2E tests).

---

## Phase 0: Initial Spike (2-3 weeks, 1-2 devs)

**Goal**: Validate feasibility via vertical slice (Individual + Observations). Uncover data type compatibility, relationship modeling, query pattern issues. **Validate critical technical decisions (embedded objects, polymorphic relationships, transaction semantics).**

### Stories

| # | Story | Validates Decision # | Key Concerns |
|---|-------|---------------------|-------------|
| 0.1 | Set up op-sqlite + Drizzle dev environment | - | Package compatibility with RN 0.76.5, SQLCipher support |
| 0.2 | Define Individual, Gender, AddressLevel schemas in Drizzle with embedded Point (registrationLocation) | #1 (Embedded Objects) | Date types, nullable fields, UUID PKs, **JSON column for Point embedded object** |
| 0.3 | Model Observation polymorphic relationship (belongs to Individual, Encounter, ProgramEnrolment) | #2 (Polymorphic Relationships) | Multiple nullable FKs, check constraints, referential integrity |
| 0.4 | Define Observation EAV pattern with JSON queries | - | `{concept: "Concept", valueJSON: "string"}` - JSON querying (`JSON_EXTRACT`), indexing on JSON fields |
| 0.5 | Write Realm-to-SQLite migration script for Individual + Observations | #3 (Schema Versioning) | Data type mapping, batch inserts, embedded object transformation |
| 0.6 | Implement 10 critical queries in both Realm and Drizzle, compare results | - | Relationship traversal (`individual.gender.uuid`), SUBQUERY for observations (`valueJSON CONTAINS`), sorting, pagination, performance |
| 0.7 | Validate nested transaction semantics (simulate `runInTransaction` pattern) | #6 (Transaction Semantics) | Nested transactions, SAVEPOINT handling, `isInTransaction` detection |
| 0.8 | Validate SQLCipher encryption with op-sqlite | - | Key management, encrypt/decrypt flow, performance overhead |
| 0.9 | Document findings: embedded object strategy, polymorphic FK performance, query translation matrix, transaction behavior, go/no-go decision | All | Data type compatibility, query feasibility, performance benchmarks, **decision validation** |

**Critical Validation Questions**:
1. Can JSON columns handle embedded objects efficiently? (Query/index performance)
2. Do polymorphic FKs cause query complexity or performance issues?
3. Can all Realm SUBQUERY patterns translate to SQL? (Especially observation queries)
4. Is nested transaction handling reliable?
5. What's the performance overhead of SQLCipher encryption?
6. Can we materialize query results to plain arrays efficiently? (No live query wrappers needed - already validated in exploration)

**Files**:
- [RealmFactory.js](packages/openchs-android/src/framework/db/RealmFactory.js)
- `openchs-models` schema definitions (Individual, Gender, AddressLevel, Concept, Observation)
- New: `packages/openchs-models/src/drizzle/spike/` for spike schemas

**Exit Criteria**:
- ✅ Findings document with data type compatibility matrix
- ✅ Query feasibility assessment with performance benchmarks
- ✅ All 6 critical validation questions answered with evidence
- ✅ **Go/no-go decision approved by team** (if major blockers found, pivot strategy)

---

## Phase 1: Repository Layer (6-8 weeks, 2-3 devs)

**Goal**: Move all direct Realm access behind repository interfaces (still Realm-backed). This is the critical foundation. **Leverages finding that code already uses plain arrays (no live query wrappers needed).**

### Stories

| # | Story | Files | Key Patterns |
|---|-------|-------|-------------|
| 1.1 | Define repository interfaces: `IRepository<T>`, `IQueryBuilder`, `ITransactionManager` | New: `src/repository/interfaces/` | **Return plain arrays/objects** (not observables - code already uses `.map(_.identity)` pattern) |
| 1.2 | Implement `RealmRepository<T>` wrapping `db.objects()`, `.filtered()`, `.write()` | New: `src/repository/realm/RealmRepository.js` | Preserve existing `.map(_.identity)` materialization pattern |
| 1.3 | Implement `RealmQueryBuilder` for backend-agnostic query API | New: `src/repository/realm/RealmQueryBuilder.js` | Translate to Realm `.filtered()` syntax |
| 1.4 | Implement `RealmTransactionManager` with nested transaction detection | New: `src/repository/realm/RealmTransactionManager.js` | Implement Decision #6 (transaction semantics) |
| 1.5 | Create RepositoryFactory + wire into BeanStore/service context | New: `src/repository/RepositoryFactory.js`, modify [BeanStore](packages/openchs-android/src/framework/beans/) | Inject repository instances into services |
| 1.6 | Migrate `BaseService` to use repository layer (keep public API unchanged) | [BaseService.js](packages/openchs-android/src/service/BaseService.js) | `this.db.objects()` → `this.repository.findAll()`, `.filtered()` → query builder, `.write()` → `transactionManager.execute()` |
| 1.7 | Migrate `EntityService` to repository | [EntityService.js](packages/openchs-android/src/service/EntityService.js) | `saveAndPushToEntityQueue()` uses transaction manager |
| 1.8 | Create 5 pilot entity repositories (Individual, Concept, Gender, AddressLevel, Observation) | New: `src/repository/realm/*Repository.js` | Entity-specific query methods (e.g., `IndividualRepository.findByGender()`) |
| 1.9 | Migrate IndividualService + ConceptService to use repositories | [IndividualService.js](packages/openchs-android/src/service/IndividualService.js), [ConceptService.js](packages/openchs-android/src/service/ConceptService.js) | Validate no Realm-specific code remains |
| 1.10 | Integration tests validating repository layer against existing Realm data | New: `test/repository/` | Test CRUD, queries, transactions, bulk operations |
| 1.11 | Repository pattern documentation + migration guide for devs | New: `docs/dbSwitchFromRealmToOpSql/RepositoryLayerGuide.md` | Include query builder API reference, common patterns, migration examples |

**Key Design Decisions**:
- **No observable wrappers** - Return plain arrays/objects (validated in exploration: code already materializes results)
- **Backend-agnostic query API** - Must translate to both Realm `.filtered()` and SQL `WHERE` clauses
- **Transaction nesting** - Implement Decision #6 (SAVEPOINT handling for future Drizzle backend)
- **Preserve existing patterns** - Keep `.map(_.identity)` during transition, remove later

**Repository Interface Example**:
```typescript
interface IRepository<T> {
  findAll(): Promise<T[]>;  // Returns plain array
  findByUuid(uuid: string): Promise<T | undefined>;
  save(entity: T): Promise<T>;
  bulkSave(entities: T[]): Promise<void>;
  delete(entity: T): Promise<void>;
  query(): IQueryBuilder<T>;
}

interface IQueryBuilder<T> {
  where(field: string, operator: string, value: any): IQueryBuilder<T>;
  whereIn(field: string, values: any[]): IQueryBuilder<T>;
  orderBy(field: string, direction: 'asc' | 'desc'): IQueryBuilder<T>;
  limit(count: number): IQueryBuilder<T>;
  execute(): Promise<T[]>;  // Returns plain array
}
```

**Exit Criteria**:
- ✅ Repository interfaces defined and stable
- ✅ RealmRepository, RealmQueryBuilder, RealmTransactionManager implemented
- ✅ BaseService + EntityService + 2 domain services (Individual, Concept) use repository layer
- ✅ All existing tests pass (no regressions)
- ✅ Integration tests validate repository CRUD and query operations

---

## Phase 2: Drizzle Schema Definitions (4-6 weeks, 3 devs, parallelizable)

**Goal**: Define Drizzle schemas for all ~90 entities in `openchs-models`. **Apply Decisions #1 (embedded objects), #2 (polymorphic relationships), #3 (schema versioning).**

### Stories

| # | Story | Applies Decision # | Entity Count |
|---|-------|-------------------|-------------|
| 2.1 | Set up Drizzle infrastructure in openchs-models (config, types, drizzle-kit) | #3 | - |
| 2.2 | Core reference data schemas with embedded objects | #1 | 15: Gender, AddressLevel, Concept (keyValues), ConceptAnswer, EncounterType, Program, SubjectType (validNameFormat), Form, FormElement (keyValues, validFormat), FormElementGroup, FormMapping, OrganisationConfig, Settings, UserInfo, Privilege |
| 2.3 | Transactional data schemas with polymorphic Observation | #2 | 20: Individual (Point embedded), ProgramEnrolment, ProgramEncounter, Encounter (Point embedded), **Observation (polymorphic FKs)**, GroupSubject, IndividualRelationship, EntityQueue, EntitySyncStatus, etc. |
| 2.4 | Checklist schemas with nested embedded objects | #1 | 3: Checklist, ChecklistItem, ChecklistItemDetail (ChecklistItemStatus → StringKeyNumericValue nested embeds) |
| 2.5 | Draft, Task, Comment, Dashboard, Media schemas | - | 30 |
| 2.6 | Remaining entity schemas (News, Rules, Video, Extension, etc.) | - | 22 |
| 2.7 | Define all foreign keys with polymorphic FK check constraints | #2 | All (focus on Observation polymorphic constraint) |
| 2.8 | Define all indexes (UUIDs, foreign keys, query-specific like voided, dates) | - | All |
| 2.9 | Generate initial Drizzle migration (v1) from Realm v203 schema | #3 | - |
| 2.10 | Schema validation tests comparing Drizzle vs Realm (column count, types, nullability) | - | All |

**Embedded Object Strategy** (Decision #1):
- **JSON columns** for: Format, KeyValue, Point, ChecklistItemStatus, StringKeyNumericValue, ReportCardResult
- **Naming convention**: embedded fields stored as `fieldName: text('field_name', { mode: 'json' }).$type<EmbeddedType>()`
- **Example**:
  ```typescript
  // SubjectType.validFirstNameFormat (embedded Format)
  validFirstNameFormat: text('valid_first_name_format', { mode: 'json' })
    .$type<{ regex: string; descriptionKey: string } | null>()

  // Individual.registrationLocation (embedded Point)
  registrationLocation: text('registration_location', { mode: 'json' })
    .$type<{ x: number; y: number } | null>()
  ```

**Polymorphic Observation** (Decision #2):
```typescript
export const observation = sqliteTable('observation', {
  uuid: text('uuid').primaryKey(),
  conceptUuid: text('concept_uuid').notNull().references(() => concept.uuid),
  valueJSON: text('value_json').notNull(),

  // Polymorphic FKs (exactly one must be non-null)
  individualUuid: text('individual_uuid').references(() => individual.uuid),
  encounterUuid: text('encounter_uuid').references(() => encounter.uuid),
  programEnrolmentUuid: text('program_enrolment_uuid').references(() => programEnrolment.uuid),
  programEncounterUuid: text('program_encounter_uuid').references(() => programEncounter.uuid),
}, (table) => ({
  // Check constraint: exactly one FK non-null
  checkOneParent: check('check_one_parent',
    sql`(
      (individual_uuid IS NOT NULL)::int +
      (encounter_uuid IS NOT NULL)::int +
      (program_enrolment_uuid IS NOT NULL)::int +
      (program_encounter_uuid IS NOT NULL)::int
    ) = 1`
  ),

  // Indexes on FKs
  individualIdx: index('observation_individual_idx').on(table.individualUuid),
  encounterIdx: index('observation_encounter_idx').on(table.encounterUuid),
  programEnrolmentIdx: index('observation_program_enrolment_idx').on(table.programEnrolmentUuid),
  programEncounterIdx: index('observation_program_encounter_idx').on(table.programEncounterUuid),
}));
```

**Migration Metadata** (Decision #3):
```sql
CREATE TABLE migration_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO migration_metadata VALUES ('realm_schema_version', '203');
INSERT INTO migration_metadata VALUES ('drizzle_schema_version', '1');
INSERT INTO migration_metadata VALUES ('migrated_at', CURRENT_TIMESTAMP);
```

**Schema Reference** (use avni-models skill):
- `/Users/himeshr/IdeaProjects/agent-skills/skills/avni-models/` has complete API reference for all 86 schemas
- Schema patterns in `api_reference/Schema.md`, `api_reference/EntityMappingConfig.md`
- Individual schema docs: `api_reference/{SchemaName}.md` (e.g., `Individual.md`, `Observation.md`)
- Reference during Drizzle schema definition to ensure field parity

**Files**:
- New: `packages/openchs-models/drizzle.config.ts`
- New: `packages/openchs-models/src/drizzle/schemas/*.ts` (86-90 files)
- New: `packages/openchs-models/drizzle/migrations/0001_initial.sql`

**Exit Criteria**:
- ✅ All ~90 entities have Drizzle schema definitions
- ✅ Embedded objects use JSON columns
- ✅ Polymorphic Observation FK with check constraint
- ✅ All relationships and indexes defined
- ✅ Drizzle v1 migration script generated
- ✅ Schema validation tests pass (column count, types match Realm)

---

## Phase 3: op-sqlite Backend Implementation (8-10 weeks, 3-4 devs)

**Goal**: Implement the repository interfaces backed by op-sqlite + Drizzle.

### Stories

| # | Story |
|---|-------|
| 3.1 | OpSqliteManager: DB initialization, Drizzle migrations, SQLCipher encryption |
| 3.2 | `DrizzleRepository<T>` implementing `IRepository<T>` (CRUD via Drizzle) |
| 3.3 | DrizzleTransactionManager (nested tx support, `isInTransaction` detection) |
| 3.4 | DrizzleQueryBuilder: translate query builder API to Drizzle/SQL (relationship traversal, JSON queries for observations, SUBQUERY equivalents) |
| 3.5 | Adapt EncryptionService for SQLCipher key management |
| 3.6 | Bulk operations optimization (batch inserts up to 1000, upsert via `ON CONFLICT`) |
| 3.7 | Implement all ~90 entity repositories (Drizzle-backed) - parallelizable across devs |
| 3.8 | Repository switcher: runtime config to choose Realm or Drizzle backend |
| 3.9 | Integration tests: run same test suite against both backends, verify result equivalence |

**Key challenges**:
- Realm `.filtered('programEnrolment.individual.gender.uuid = "..."')` -> Drizzle JOINs
- Realm `SUBQUERY(observations, $concept, concept.uuid == '...' AND valueJSON CONTAINS '...').@count > 0` -> SQL subquery with JSON functions
- Realm `TRUEPREDICATE sort(...) Distinct(...)` -> SQL `ORDER BY ... GROUP BY ...`

**Exit criteria**: All repositories implemented for both backends, integration tests pass on both.

---

## Phase 4: Service Migration (10-12 weeks, 3-4 devs, highly parallelizable)

**Goal**: Migrate all 89 services to use repository layer, remove direct `this.db` usage.

### Stories (batched by domain)

| # | Batch | Services | Complexity |
|---|-------|----------|-----------|
| 4.1 | Simple reference services | GenderService, SubjectTypeService, EncounterTypeService, ProgramService, FormMappingService, LocationHierarchyService, SettingsService, OrganisationConfigService, UserInfoService, PrivilegeService, etc. (~15) | Low |
| 4.2 | Registration services | IndividualService, GroupSubjectService, FamilyService, SubjectMigrationService (~5) | Medium |
| 4.3 | Enrolment services | ProgramEnrolmentService, SubjectProgramEligibilityService, ProgramConfigService (~3) | Medium |
| 4.4 | Encounter services | EncounterService, ProgramEncounterService, ChecklistService (~4) | High |
| 4.5 | Draft services | DraftSubjectService, DraftEnrolmentService, DraftEncounterService, DraftProgramEncounterService (~4) | Medium |
| 4.6 | Relationship + Task + Comment services (~9) | IndividualRelationshipService, TaskService, CommentService, etc. | Medium |
| 4.7 | Dashboard services | CustomDashboardService, ReportCardService, DashboardFilterService (~6) | High |
| 4.8 | Remaining services (~10+) | MediaService, NewsService, IdentifierAssignmentService, etc. | Low-Medium |
| 4.9 | Service integration testing | Validate all services with both backends | - |

**Exit criteria**: No service directly references `this.db`, all tests pass.

---

## Phase 5: Rules Engine Migration (6-8 weeks, 2-3 devs + server team)

**Goal**: Rules use repository layer instead of raw `db` access.

### Stories

| # | Story |
|---|-------|
| 5.1 | Analyze all rules that use `db` parameter - catalog query patterns and counts |
| 5.2 | Create `RuleRepositoryContext`: replace `{db: this.db, services}` with `{repositories, services}` in [getCommonParams()](packages/openchs-android/src/service/RuleEvaluationService.js#L1079-L1085) |
| 5.3 | Build dashboard query helper functions (count subjects, filter by observations, date ranges, aggregations) |
| 5.4 | Migrate [CustomFilterService.js](packages/openchs-android/src/service/CustomFilterService.js) SUBQUERY patterns to repository queries |
| 5.5 | Migrate [ReportCardQueryBuilder.js](packages/openchs-android/src/service/customDashboard/ReportCardQueryBuilder.js) to use repository query builder |
| 5.6 | Pilot: rewrite 5 sample dashboard report card rules using new API, validate results match |
| 5.7 | Rule migration guide for server team (query pattern translations, helper function catalog) |
| 5.8 | Coordinate server-side rule updates across all orgs |

**Critical**: This requires coordinated server + client changes. Rules are defined server-side and executed client-side.

**Exit criteria**: `getCommonParams()` no longer exposes `db`, all rule types tested and validated.

---

## Phase 6: Sync Infrastructure Migration (4-5 weeks, 2-3 devs)

### Stories

| # | Story | Files |
|---|-------|-------|
| 6.1 | Migrate SyncService to use repository (`persistAll`, `bulkSaveOrUpdate`) | [SyncService.js](packages/openchs-android/src/service/SyncService.js) |
| 6.2 | Migrate EntityQueueService to repository | EntityQueueService.js |
| 6.3 | Migrate EntitySyncStatusService to repository | EntitySyncStatusService.js |
| 6.4 | Optimize bulk sync writes for op-sqlite (batch inserts, upsert via `ON CONFLICT DO UPDATE` replacing `Realm.UpdateMode.Modified`) | SyncService.js |
| 6.5 | Migrate ResetSyncService | ResetSyncService.js |
| 6.6 | Sync integration testing with sanitized production data | New: `test/sync/` |
| 6.7 | Sync performance benchmarking (Realm vs op-sqlite, target: <20% slower) | - |

**Exit criteria**: Full sync cycle works with op-sqlite backend, performance acceptable.

---

## Phase 7: Testing & Validation (6-8 weeks, 3-4 devs + QA)

### Stories

| # | Story |
|---|-------|
| 7.1 | Create 5 sanitized standard test databases (diverse production data) in both Realm and SQLite formats |
| 7.2 | Query result validation framework: execute same query on both backends, compare results |
| 7.3 | Validate all critical queries (~200+) from `.filtered()` usage across codebase |
| 7.4 | E2E user journey tests (registration, enrolment, encounter, dashboard, sync, search) |
| 7.5 | Data integrity validation (referential integrity, no orphans, observation consistency) |
| 7.6 | Stress testing (10K+ individuals, 100K+ observations) |
| 7.7 | Encryption validation (SQLCipher, key rotation) |
| 7.8 | Device compatibility testing (low-end 2GB RAM Android 8, mid-range, high-end) |
| 7.9 | Bug triage and fixing (buffer: ~80 hours) |

**Exit criteria**: All queries validated, E2E tests pass, no critical bugs, performance acceptable across devices.

---

## Phase 8: Rollout (8-10 weeks, 2-3 devs)

### Stories

| # | Story |
|---|-------|
| 8.1 | Server-side: add `databaseBackend` org config + API endpoint + admin UI + user-group targeting for staged rollout |
| 8.2 | App: backend selector - fetch org config on login, initialize correct DB | Modify [RealmFactory.js](packages/openchs-android/src/framework/db/RealmFactory.js) -> `DatabaseFactory.js` |
| 8.3 | Fresh sync flow with pre-migration sync enforcement (Decision #4): detect backend change → check EntityQueue → force sync if needed → clear old DB → init op-sqlite → full sync | New: `DatabaseMigrationView.js`, `PreMigrationSyncView.js` |
| 8.4 | Migration telemetry (success/failure rates, sync time, app performance) |
| 8.5 | Rollback mechanism (server reverts org to Realm, app re-initializes) |
| 8.6 | Pilot rollout: 1-2 orgs (~100 users), 2 weeks monitoring |
| 8.7 | Beta rollout: 5-10 orgs (~1000 users), 3-4 weeks |
| 8.8 | GA rollout: 10% -> 30% -> 60% -> 100% over 8 weeks |
| 8.9 | Remove Realm dependency from package.json and all Realm-specific code |
| 8.10 | Final documentation and knowledge transfer |

**Phase 8.3 Detailed Flow** (Pre-Migration Sync Enforcement - Decision #4):

1. **User logs in** → App fetches org config from server
2. **Detect DB backend change**: Compare `orgConfig.databaseBackend` vs `AsyncStorage.getItem('currentBackend')`
3. **If backend changed** from Realm to op-sqlite:
   - **Check EntityQueue**: Query `SELECT COUNT(*) FROM EntityQueue WHERE saved = false`
   - **If pending uploads exist** (count > 0):
     - Show `PreMigrationSyncView` modal (blocking, can't dismiss):
       - "Database update required. Please sync your pending changes before updating."
       - Display: "Pending uploads: {count} items"
       - Button: "Sync Now" → trigger `SyncService.sync()`
       - Progress indicator during sync
     - **Block app usage** until EntityQueue empty
     - **Re-check after sync**: Loop back to step 3
   - **If no pending uploads** (count = 0):
     - Show `DatabaseMigrationView` modal:
       - "Database update in progress. This will download fresh data from the server."
       - Button: "Start Migration"
     - User confirms → proceed:
       - Clear Realm database: `RealmFactory.deleteRealmFile()`
       - Update `AsyncStorage.setItem('currentBackend', 'opsqlite')`
       - Initialize op-sqlite via `OpSqliteManager.initialize()`
       - Trigger full sync: `SyncService.fullSync()` (sets all EntitySyncStatus to sentinel date)
       - Show progress: "Syncing data... {entity}/{totalEntities}"
     - After sync complete → navigate to home screen

**Fallback**: If user offline during migration → show error: "Internet required for database update. Please connect and try again."

**Files**:
- New: `packages/openchs-android/src/views/migration/PreMigrationSyncView.js`
- New: `packages/openchs-android/src/views/migration/DatabaseMigrationView.js`
- Modified: `packages/openchs-android/src/framework/db/DatabaseFactory.js` (backend detection)
- Modified: `packages/openchs-android/src/service/SyncService.js` (fullSync method)

**Exit criteria**: 100% orgs on op-sqlite, Realm dependency removed, crash rate <0.5%.

---

## Effort Summary

| Phase | Duration | Effort (hours) | Parallelizable |
|-------|----------|---------------|----------------|
| 0: Spike | 2-3 weeks | ~60 | No (foundational) |
| 1: Repository Layer | 6-8 weeks | ~150 | Partially |
| 2: Drizzle Schemas | 4-6 weeks | ~200 | Yes (by entity group) |
| 3: op-sqlite Backend | 8-10 weeks | ~360 | Yes (by repository) |
| 4: Service Migration | 10-12 weeks | ~390 | Yes (by service batch) |
| 5: Rules Engine | 6-8 weeks | ~200 | Partially |
| 6: Sync | 4-5 weeks | ~125 | Partially |
| 7: Testing | 6-8 weeks | ~380 | Yes |
| 8: Rollout | 8-10 weeks | ~350 | No (sequential) |
| **Total** | **~12-14 months** | **~2,215 hours** | |

**Team**: 3-4 developers, 1 QA (50%), server team for rules + org config

**Phases 2-4 can overlap** (schemas -> backend -> service migration is a pipeline).
**Phase 5 (rules) can start during Phase 4** once repository APIs are stable.

---

## Top Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Realm query patterns that don't translate to SQL | Could block migration of specific services | Phase 0 spike validates critical patterns early |
| Rules engine has hundreds of org-specific rules using raw `db` | Server-side coordination across many orgs | Rule migration guide + helper functions reduce per-rule effort |
| Performance regression on low-end devices | User experience degradation | Phase 7 device testing, optimization budget |
| Fresh sync takes too long for large orgs | User frustration during migration | Optimize initial sync performance, allow delayed migration |
| op-sqlite/Drizzle introduce breaking changes during migration | Rework needed | Pin versions, monitor changelogs |

---

## GitHub Story Structure

**Epics** (one per phase):
- `[Epic] Phase 0: Initial Spike`
- `[Epic] Phase 1: Repository Layer`
- ... through Phase 8

**Stories** (from tables above), labeled: `db-migration`, `phase-X`, priority label

**Template**:
```
Title: [Phase X.Y] <Story title>
Labels: db-migration, phase-X
Epic: Phase X: <Name>

## Description
<Story description>

## Acceptance Criteria
- [ ] <specific criteria>
- [ ] Tests pass
- [ ] Code reviewed

## Files
<key files>

## Dependencies
<prerequisite stories>
```

---

## Verification

After each phase:
1. Run full existing test suite - all must pass
2. For phases 3+: run repository integration tests against both Realm and Drizzle backends
3. For phases 4-6: verify query results match between backends using standard test databases
4. Phase 7: comprehensive E2E, stress, and device testing
5. Phase 8: monitor telemetry dashboards during rollout
