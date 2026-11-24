import BeanRegistry from "./framework/bean/BeanRegistry";
import _ from 'lodash';
import {initAnalytics, updateAnalyticsDatabase} from "./utility/Analytics";
import General from "./utility/General";
import {BACKENDS} from "./framework/BackendTypes";
import Perf from "./utility/perf";

let singleton;

class GlobalContext {
    // INVARIANT: `this.db` is the Realm instance and is never reassigned by switchBackend().
    // The active database handed to the bean registry is selected via _activeBackend +
    // sqliteDb. It is null only between a close and the reopen that follows it, and only
    // ever nulled by whatever did the closing — see reinitializeDatabase.
    db;
    sqliteDb;
    beanRegistry;
    routes;
    reduxStore;
    _activeBackend;
    _realmFactory;

    static getInstance() {
        if (_.isNil(singleton)) {
            singleton = new GlobalContext();
        }
        return singleton;
    }

    constructor() {
        this.beanRegistry = new BeanRegistry();
    }

    isInitialised() {
        return !_.isNil(this.reduxStore);
    }

    async initialiseGlobalContext(appStore, realmFactory) {
        // A stale key with plaintext db files (interrupted encryption) crashes the
        // Realm open natively — reconcile before touching either database.
        // Lazy load to avoid circular dependency.
        const EncryptionService = require("./service/EncryptionService").default;
        const _tEnc = Date.now();
        await EncryptionService.removeStaleKeyIfDbsPlaintext();
        Perf.mark("startup.encryptionReconcile", {ms: Date.now() - _tEnc});

        // Kept for openRealmIfMissing, which runs long after this and has no caller holding one.
        this._realmFactory = realmFactory;

        // Always initialize Realm (needed during transition for unsynced data verification)
        // avni-client#2084 instrumentation: on a large realm this is the dominant part of a cold start
        // and it scales with data size, unlike the dev-bundle fetch which does not exist in a release build.
        const _t0 = Date.now();
        this.db = await realmFactory.createRealm();
        Perf.mark("startup.realmOpen", {ms: Date.now() - _t0});

        // Initialize SQLite alongside Realm
        // Marked even on the failure path: a slow-then-failing open still costs cold start, and
        // without a mark here the startup.* marks would stop summing to the real cold-start time.
        const _tSqlite = Date.now();
        try {
            const SqliteFactory = require("./framework/db/SqliteFactory").default;
            this.sqliteDb = await SqliteFactory.createSqliteProxy();
            General.logInfo("GlobalContext", "SQLite database initialized");
            Perf.mark("startup.sqliteInit", {ms: Date.now() - _tSqlite});
        } catch (e) {
            Perf.mark("startup.sqliteInit", {ms: Date.now() - _tSqlite, failed: true});
            General.logWarn("GlobalContext", `SQLite init skipped: ${e.message}`);
        }

        // Boot the bean registry on Realm, then open the backend the per-user state record
        // commits to (below, before the store exists). The record is keyed by the session
        // username, which needs services wired up to resolve for pre-#2083 installs.
        this._activeBackend = BACKENDS.REALM;
        General.logInfo("GlobalContext", `Initialising bean registry with activeBackend=${this._activeBackend}`);
        const _t1 = Date.now();
        this.beanRegistry.init(this.db);
        Perf.mark("startup.beanRegistryInit", {ms: Date.now() - _t1});

        // Runtime validation: Verify critical services are registered
        const criticalServices = [
            'entityService',
            'individualService',
            'syncService',
            'customDashboardService',
            'dashboardSectionCardMappingService'
        ];

        const missingServices = criticalServices.filter(
            serviceName => !this.beanRegistry.getService(serviceName)
        );

        if (missingServices.length > 0) {
            const errorMsg = `CRITICAL: Services not registered: ${missingServices.join(', ')}. ` +
                           `Ensure src/service/AllServices.js is imported in App.js`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Open the committed backend before the store exists, so nothing renders or schedules
        // on the wrong database. An unfinished migration committed nothing and boots on the
        // complete source backend; its work waits for the next sync the user starts.
        try {
            const migrationService = this.beanRegistry.getService('sqliteMigrationService');
            if (migrationService) {
                await migrationService.openCommittedBackend();
            }
        } catch (e) {
            General.logError("GlobalContext", `Opening the committed backend failed: ${e.message}`);
        }

        this.reduxStore = appStore.create(this.beanRegistry.beansMap);
        this.beanRegistry.setReduxStore(this.reduxStore);
        const restoreRealmService = this.beanRegistry.getService("backupRestoreRealmService");
        restoreRealmService.subscribeOnRestore(async () => await this.onDatabaseRecreated(realmFactory));
        restoreRealmService.subscribeOnRestoreFailure(async () => await this.reinitializeDatabase(realmFactory));

        // SQLite fast-sync apply: on success, reopen the (now-replaced) SQLite
        // file and flip the bean registry to SQLite as the primary backend.
        // On failure, reinitialize and open the committed backend (BackupRestoreSqliteService
        // has already restored the .backup file before invoking this callback).
        const restoreSqliteService = this.beanRegistry.getService("backupRestoreSqliteService");
        if (restoreSqliteService) {
            restoreSqliteService.subscribeOnRestore(async () => await this.onSqliteDatabaseRestored(realmFactory));
            restoreSqliteService.subscribeOnRestoreFailure(async () => await this.onSqliteRestoreFailed(realmFactory));
        }
        await initAnalytics(this.db);
    }

    /**
     * Switch the active backend at runtime. Used by SqliteMigrationService when
     * a user is added to or removed from the SQLite Migration server group.
     * Source backend is left intact (not closed) so failed migrations can fall back.
     */
    switchBackend(targetBackend) {
        if (targetBackend === this._activeBackend) return;
        if (targetBackend === BACKENDS.SQLITE && !this.sqliteDb) {
            throw new Error("Cannot switch to SQLite — sqliteDb not initialised");
        }
        // The same guard for Realm. this.db is null between a close and the reopen that
        // follows it, so a reopen that failed leaves nothing here — and binding that null
        // hands every service a database it cannot use while _activeBackend reports Realm
        // as if the move had happened. Throwing keeps the runtime where it is, so the
        // committed-backend guard on the next sync still sees the truth.
        if (targetBackend === BACKENDS.REALM && !this.db) {
            throw new Error("Cannot switch to Realm — the database is not open");
        }
        const targetDb = targetBackend === BACKENDS.SQLITE ? this.sqliteDb : this.db;
        General.logInfo("GlobalContext", `Switching backend ${this._activeBackend} → ${targetBackend}`);
        this.beanRegistry.updateDatabase(targetDb);
        this._activeBackend = targetBackend;
    }

    getActiveBackend() {
        return this._activeBackend;
    }

    // The Realm half of openSqliteIfMissing. Nothing reopens Realm after a failed reinit, so
    // a fall back to it would otherwise refuse for the rest of the process.
    async openRealmIfMissing() {
        if (this.db) return true;
        if (!this._realmFactory) {
            General.logWarn("GlobalContext", "Realm open retry skipped: no factory recorded at launch");
            return false;
        }
        try {
            this.db = await this._realmFactory.createRealm();
            updateAnalyticsDatabase(this.db);
            General.logInfo("GlobalContext", "Realm database opened on retry");
        } catch (e) {
            General.logWarn("GlobalContext", `Realm open retry failed: ${e.message}`);
            return false;
        }
        return this._bindIfActive(BACKENDS.REALM, this.db);
    }

    // switchBackend() refuses SQLite while sqliteDb is missing, and nothing else reopens it
    // after a failed open at launch. Callers that must reach SQLite try again here first.
    async openSqliteIfMissing() {
        if (this.sqliteDb) return true;
        try {
            const SqliteFactory = require("./framework/db/SqliteFactory").default;
            this.sqliteDb = await SqliteFactory.createSqliteProxy();
            General.logInfo("GlobalContext", "SQLite database opened on retry");
        } catch (e) {
            General.logWarn("GlobalContext", `SQLite open retry failed: ${e.message}`);
            return false;
        }
        return this._bindIfActive(BACKENDS.SQLITE, this.sqliteDb);
    }

    // A reopen of the backend already active is invisible to switchBackend, which returns
    // early on no change, so the registry would keep the handle that died. Bind it here.
    _bindIfActive(backend, db) {
        if (this._activeBackend !== backend) return true;
        try {
            this.beanRegistry.updateDatabase(db);
            return true;
        } catch (e) {
            General.logError("GlobalContext", `Binding the reopened ${backend} database failed: ${e.message}`);
            return false;
        }
    }

    async onDatabaseRecreated(realmFactory) {
        this.db?.close();
        // Whoever closes the Realm drops the reference. A closed handle left on this.db
        // reads as a usable database and fails at some unrelated point much later.
        this.db = null;
        await this.reinitializeDatabase(realmFactory);
    }

    // Returns false when the snapshot is in place but SQLite could not be opened on it.
    // The restore must not report success then: it would commit SQLite as the active
    // backend while the runtime has fallen back to Realm.
    async onSqliteDatabaseRestored(realmFactory) {
        this._activeBackend = BACKENDS.SQLITE;
        General.logInfo("GlobalContext", "SQLite snapshot restored — switching active backend to SQLite");
        const reopened = await this.reinitializeDatabase(realmFactory);
        return reopened && this._activeBackend === BACKENDS.SQLITE;
    }

    // The restore records SQLite as active only once it succeeds, so after a failure — even
    // one after the file swap flipped the runtime — the record still names the backend the
    // device was committed to before the restore began. Usually that is Realm on a fresh
    // install, but a SQLite user whose data a full reset wiped also reads as never synced.
    async onSqliteRestoreFailed(realmFactory) {
        await this.reinitializeDatabase(realmFactory);
        try {
            const migrationService = this.beanRegistry.getService('sqliteMigrationService');
            if (migrationService) {
                await migrationService.openCommittedBackend();
            }
        } catch (e) {
            General.logError("GlobalContext", `Opening the committed backend after a failed restore failed: ${e.message}`);
        }
    }

    // Never throws. Both restore-failure callbacks run through here with nothing around them,
    // and a throw strands the login screen on its restore spinner with no callback fired.
    // Returns false when neither database could be opened, so a caller that reports an
    // outcome to the user has something to report it from.
    async reinitializeDatabase(realmFactory) {
        try {
            this.db = await realmFactory.createRealm();
            updateAnalyticsDatabase(this.db);
        } catch (e) {
            // this.db is left as it is. Two callers reach here with the Realm still open and
            // healthy — the SQLite restore's failure callback and the Realm restore's — and
            // dropping a working handle for them would be worse than the failed reopen. The
            // two that close it first null it themselves, so there is nothing to keep.
            General.logError("GlobalContext", `Realm reinit failed: ${e.message}`);
        }

        // Recreate SQLite DB
        if (this.sqliteDb) {
            try {
                this.sqliteDb.close();
            } catch (e) {
                General.logWarn("GlobalContext", `SQLite close error: ${e.message}`);
            }
        }
        try {
            const SqliteFactory = require("./framework/db/SqliteFactory").default;
            this.sqliteDb = await SqliteFactory.createSqliteProxy();
        } catch (e) {
            // The handle above is closed; leaving it bound would hand the registry a dead database.
            this.sqliteDb = null;
            General.logWarn("GlobalContext", `SQLite reinit skipped: ${e.message}`);
        }

        // Re-apply the previously active backend choice (preserved across re-init). Without
        // SQLite the runtime is on Realm, and _activeBackend says so, so the sync guard sees
        // the mismatch with the committed backend rather than a runtime that claims SQLite.
        if (this._activeBackend === BACKENDS.SQLITE && !this.sqliteDb) {
            this._activeBackend = BACKENDS.REALM;
        }
        const activeDb = this._activeBackend === BACKENDS.SQLITE ? this.sqliteDb : this.db;
        if (!activeDb) {
            // There is nothing to bind. The registry keeps whatever it had, which on the
            // onDatabaseRecreated path is the handle that caller closed — no worse than
            // binding it again, and no better. What the false buys is a caller that can
            // report the failure instead of reporting success.
            General.logError("GlobalContext", "Neither database could be reopened — bean registry left as it was");
            return false;
        }
        // Guarded for the same reason as the opens above: on a backend type change this
        // rebuilds every cached repository, and the Realm restore's failure callback runs
        // it with nothing around it.
        try {
            this.beanRegistry.updateDatabase(activeDb);
        } catch (e) {
            General.logError("GlobalContext", `Binding the reopened database failed: ${e.message}`);
            return false;
        }
        return true;
    }
}

export default GlobalContext;
