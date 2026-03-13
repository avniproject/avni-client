# Repository Migration Guide

## Epic Phase 1: Repository Layer (Complete)

Epic #1848 Phase 1 abstracts all direct database access in the service layer behind repository interfaces, while still using Realm as the backend.

### Architecture

```
Service Layer  →  Repository Layer  →  Realm
                  (BaseRepository)     (RealmRepository)
                  (TransactionManager)
                  (RepositoryFactory)
```

**Key classes:**
- `BaseRepository` — interface defining `findAll()`, `create()`, `delete()`, etc.
- `RealmRepository` — Realm implementation of BaseRepository
- `TransactionManager` — wraps `db.write()` with nesting support via `runInTransaction()`
- `RepositoryFactory` — creates/caches repository instances per schema

### Migration Pattern

| Before (direct Realm) | After (repository layer) |
|---|---|
| `this.db.objects(schema)` | `this.getRepository(schema).findAll()` |
| `this.db.write(() => {...})` | `this.transactionManager.write(() => {...})` |
| `db.create(schema, entity, mode)` | `this.getRepository(schema).create(entity, mode)` |
| `this.db.create(schema, entity, true)` | `this.repository.create(entity, true)` |
| `db.delete(obj)` | `this.db.delete(obj)` (inside transaction blocks) |

**Helper method refactoring:** Methods that received `db` as a parameter (e.g., `_saveEncounter(encounter, db)`) were refactored to use `this.repository` / `this.getRepository()` internally, removing the `db` parameter.

### What's NOT migrated (by design)

- **AnonymizeRealmService** — uses a separate Realm instance with `beginTransaction()/commitTransaction()`
- **EncryptionService** — uses `this.db.writeCopyTo()`, not write transactions
- **BaseService.safeDelete()** — raw delete, always called inside existing write blocks
- **BackupRestoreRealmService.backup()** — uses `this.db.writeCopyTo()` for file export

### Phase 1 Commits

1. **Phase 1a** (`f050ae0`): Created repository abstraction. Migrated reads in IndividualService and ConceptService.
2. **Phase 1b** (`cbd4675`): Migrated BaseService reads+writes and all `this.db.objects()` calls in 14 services.
3. **Phase 1c**: Eliminated all remaining `this.db.write()`, `this.db.create()` calls in 25+ child services. Completed service layer decoupling.

### Remaining direct `this.db` usage in service layer

After Phase 1, these patterns remain (by design):
- `this.db.delete()` — used inside `transactionManager.write()` blocks (no repository abstraction needed)
- `this.db.writeCopyTo()` — Realm-specific file export in EncryptionService, BackupRestoreRealmService
- `this.db.schemaVersion` — read-only metadata access in BaseService
- `this.db.isInTransaction` — used by TransactionManager
- Services not in Phase 1 scope: CustomDashboardCacheService, BeneficiaryModePinService, PrivilegeService, SubjectMigrationService, EntitySyncStatusService

### Next phases (Epic #1848)

- **Phase 2:** Schema & Migration Framework — SQLite schema definitions, versioned migration system
- **Phase 3:** op-sqlite Backend — SqliteRepository replacing RealmRepository
- **Phase 4:** Service Migration — fix implicit live-object mutation patterns
