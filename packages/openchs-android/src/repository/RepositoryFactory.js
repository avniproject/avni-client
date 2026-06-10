import RealmRepository from './RealmRepository';
import SqliteRepository from './SqliteRepository';
import TransactionManager from './TransactionManager';
import IndividualRepository from './IndividualRepository';
import ConceptRepository from './ConceptRepository';
import AddressLevelRepository from './AddressLevelRepository';
import {Individual, Concept, AddressLevel} from 'openchs-models';

class RepositoryFactory {
    constructor(db) {
        this.db = db;
        this._isSqlite = !!db.isSqlite;
        this._cache = new Map();
        this._transactionManager = new TransactionManager(db);
        this._registerPilotRepositories(db);
    }

    _registerPilotRepositories(db) {
        if (!this._isSqlite) {
            this._cache.set(Individual.schema.name, new IndividualRepository(db));
            this._cache.set(Concept.schema.name, new ConceptRepository(db));
            this._cache.set(AddressLevel.schema.name, new AddressLevelRepository(db));
        }
    }

    getRepository(schemaName) {
        if (!this._cache.has(schemaName)) {
            const Repository = this._isSqlite ? SqliteRepository : RealmRepository;
            this._cache.set(schemaName, new Repository(this.db, schemaName));
        }
        return this._cache.get(schemaName);
    }

    registerRepository(schemaName, repositoryInstance) {
        this._cache.set(schemaName, repositoryInstance);
    }

    get transactionManager() {
        return this._transactionManager;
    }

    // -------- Backend-aware database admin --------
    //
    // These wrap the SQLite-only db-level operations behind the repository
    // layer so services don't have to do `if (this.db.isSqlite) this.db._executeRaw(...)`
    // themselves. Each one is a no-op on Realm and returns false; on SQLite
    // they invoke the corresponding op-sqlite call and return true so the
    // caller can log conditionally.

    setForeignKeysEnabled(enabled) {
        if (!this._isSqlite) return false;
        this.db._executeRaw(`PRAGMA foreign_keys = ${enabled ? "ON" : "OFF"}`);
        return true;
    }

    runForeignKeyCheck() {
        if (!this._isSqlite) return [];
        return this.db._executeQuery("PRAGMA foreign_key_check") || [];
    }

    setShallowHydrationMode(enabled) {
        if (!this._isSqlite || typeof this.db.setShallowMode !== "function") return false;
        this.db.setShallowMode(enabled);
        return true;
    }

    buildReferenceCache(cacheConfigs) {
        if (!this._isSqlite || typeof this.db.buildReferenceCache !== "function") return false;
        this.db.buildReferenceCache(cacheConfigs);
        return true;
    }

    updateDatabase(db) {
        const wasSqlite = this._isSqlite;
        this.db = db;
        this._isSqlite = !!db.isSqlite;
        this._transactionManager.updateDatabase(db);

        if (wasSqlite !== this._isSqlite) {
            // Backend type changed (Realm ↔ SQLite). Cached repositories were
            // created for the old backend type and can't be reused — clear the
            // cache so getRepository() creates the right type on next access.
            this._cache.clear();
            this._registerPilotRepositories(db);
        } else {
            this._cache.forEach(repository => repository.updateDatabase(db));
        }
    }
}

export default RepositoryFactory;
