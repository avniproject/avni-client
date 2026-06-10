# Repository Layer Migration Guide

## Overview

The repository layer provides an abstraction over database access to enable migrating from Realm to SQLite without touching service code. Services access data through `BaseRepository` subclasses instead of `this.db` directly.

## Architecture

```
Service → Repository (BaseRepository/RealmRepository) → Database (Realm/SQLite)
                ↑
        RepositoryFactory (caching, custom registration)
                ↑
          BeanRegistry (lifecycle management)
```

### Key Classes

| Class | Path | Purpose |
|-------|------|---------|
| `BaseRepository` | `src/repository/BaseRepository.js` | Abstract base with "not implemented" methods |
| `RealmRepository` | `src/repository/RealmRepository.js` | Concrete Realm implementation |
| `TransactionManager` | `src/repository/TransactionManager.js` | Wraps `db.write()` / `db.isInTransaction` |
| `RepositoryFactory` | `src/repository/RepositoryFactory.js` | Creates/caches repositories per schema |

## API Reference

### Accessing Repositories from Services

```javascript
// Default repository (uses this.getSchema())
this.repository.findAll()

// Repository for a different schema
this.getRepository(ProgramEncounter.schema.name).findAll()

// Transaction manager
this.transactionManager.write(() => {
    this.repository.create(entity, true);
});
this.transactionManager.runInTransaction(() => {
    // Nests safely — if already in a transaction, runs fn directly
});
```

### RealmRepository Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `findAll()` | RealmResults | `db.objects(schema)` — chainable with `.filtered()`, `.sorted()` |
| `findByUuid(uuid)` | Object/null | Find single entity by UUID |
| `findByKey(keyName, value)` | Object/null/Results | Find by arbitrary key |
| `findAllByKey(keyName, value)` | RealmResults | All matching key=value |
| `findAllByCriteria(filterString)` | RealmResults | Filter with Realm query string |
| `filtered(...args)` | RealmResults | Pass-through to `objects().filtered()` |
| `save(entity)` | entity | Create (no upsert) within transaction |
| `saveOrUpdate(entity)` | entity | Create with upsert within transaction |
| `bulkSaveOrUpdate(entities)` | void | Upsert all in single transaction |
| `create(entity, updateMode)` | Object | Raw `db.create()` — **must be called inside a transaction** |
| `delete(objectOrObjects)` | void | Delete within transaction |
| `objectForPrimaryKey(key)` | Object/undefined | Lookup by primary key |
| `count()` | number | Total object count |
| `getAllNonVoided()` | RealmResults | `filtered("voided = false")` |
| `existsByUuid(uuid)` | boolean | Check existence |

## Migration Checklist

### Phase 1: Repository abstraction layer (complete)

1. Identify `this.db.objects(SchemaName)` calls in your service
2. Replace with `this.repository.findAll()` (same schema) or `this.getRepository(SchemaName).findAll()` (cross-schema)
3. Chained `.filtered()` / `.sorted()` calls work unchanged — `findAll()` returns the same `RealmResults`
4. Replace `this.db.objectForPrimaryKey(schema, key)` with `this.repository.objectForPrimaryKey(key)`

### Phase 2: BaseService & remaining read-only services (complete)

BaseService read and write methods now delegate to the repository/transactionManager layer. This means all 52+ child services that call inherited methods like `findAll()`, `getAllNonVoided()`, `existsByUuid()`, `saveOrUpdate()`, `save()`, `delete()`, `runInTransaction()` automatically go through the repository abstraction.

**BaseService methods migrated:**
- **Reads:** `findAll()`, `getAll()`, `getAllNonVoided()`, `existsByUuid()`, `filtered()` — delegate to `this.getRepository(schema)`
- **Writes:** `saveOrUpdate()`, `save()`, `bulkSaveOrUpdate()`, `delete()`, `deleteAll()`, `clearDataIn()`, `runInTransaction()` — use `this.transactionManager`
- **Skipped:** `getCreateEntityFunctions()` — closure captures `this.db.create` for SyncService batch (Phase 3), `safeDelete()` — called inside existing transactions

**Read-only services migrated (10):** DashboardFilterService, FormMappingService, CustomFilterService, FamilyService, PrivilegeService, RuleService, MetricsService, EntitySyncStatusService, IndividualRelationshipTypeService, SyncTelemetryService

**Mixed services — reads migrated (4):** EncounterService, EntityQueueService, ProgramEnrolmentService, IndividualRelationshipService

Inherited methods (`findAllByCriteria()`, `findAllByKey()`, `findByKey()`, `findByUUID()`, `findByCriteria()`, `findByFiltered()`, `findOnly()`, `loadAll()`, `loadAllNonVoided()`, `getCount()`, `filterBy()`, `findUniqBy()`) no longer need per-service migration — they delegate through the migrated base methods.

### Phase 3: Write methods in child services (future)

1. Replace `this.db.write(() => db.create(...))` with `this.transactionManager.write(() => this.repository.create(entity, updateMode))`
2. Cross-schema writes within a single transaction: use `this.transactionManager.write()` and call `.create()` on multiple repositories
3. Migrate `getCreateEntityFunctions()` for SyncService batch pattern

### Do NOT migrate yet

- Methods with complex cross-schema writes (e.g., `register()` in IndividualService, FamilyService)
- Methods using `Realm.UpdateMode.Modified` in `getCreateEntityFunctions()` — SyncService batch pattern
- EntityService — dynamic schema throughout, needs special handling
- BackupRestoreRealmService / EncryptionService — use `writeCopyTo()`, Realm-specific

## Creating Custom Repositories

For entity-specific query methods:

```javascript
import RealmRepository from './RealmRepository';
import {MyEntity} from 'openchs-models';

class MyEntityRepository extends RealmRepository {
    constructor(db) {
        super(db, MyEntity.schema.name);
    }

    findByCustomCriteria(value) {
        return this.findAll().filtered('customField = $0', value);
    }
}

export default MyEntityRepository;
```

Register in `RepositoryFactory._registerPilotRepositories()`:

```javascript
this._cache.set(MyEntity.schema.name, new MyEntityRepository(db));
```

## Common Pitfalls

1. **`create()` vs `save()`**: `create()` does NOT wrap in a transaction — you must call it inside `transactionManager.write()`. `save()` and `saveOrUpdate()` wrap automatically.

2. **`findAll()` returns live results**: The returned `RealmResults` is a live proxy — changes to the DB are reflected immediately. This is existing Realm behavior, unchanged by the repository layer.

3. **Schema name is baked in**: Each repository instance is bound to a schema. Use `this.getRepository(otherSchema)` for cross-schema queries.

4. **`this.db` still works**: Existing code using `this.db` directly continues to work. The repository is additive, not a replacement (yet).
