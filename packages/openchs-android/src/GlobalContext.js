import BeanRegistry from "./framework/bean/BeanRegistry";
import _ from 'lodash';
import {initAnalytics, updateAnalyticsDatabase} from "./utility/Analytics";
import General from "./utility/General";
import {BACKENDS} from "./framework/BackendTypes";

let singleton;

class GlobalContext {
    // INVARIANT: `this.db` is always the Realm instance and is never reassigned by
    // switchBackend(). The active database handed to the bean registry is selected
    // via _activeBackend + sqliteDb. Code that needs the Realm instance directly
    // (e.g., SqliteMigrationService._captureAuthStateFromSource during resume)
    // relies on this invariant.
    db;
    sqliteDb;
    beanRegistry;
    routes;
    reduxStore;
    _activeBackend;

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
        // Always initialize Realm (needed during transition for unsynced data verification)
        this.db = await realmFactory.createRealm();

        // Initialize SQLite alongside Realm
        try {
            const SqliteFactory = require("./framework/db/SqliteFactory").default;
            this.sqliteDb = await SqliteFactory.createSqliteProxy();
            General.logInfo("GlobalContext", "SQLite database initialized");
        } catch (e) {
            General.logWarn("GlobalContext", `SQLite init skipped: ${e.message}`);
        }

        // Always boot the bean registry on Realm. Migration state is keyed per-username
        // in AsyncStorage, so we cannot know which backend to use before services are
        // wired up and UserInfo is readable. SqliteMigrationService.resumeIfPending()
        // runs after services initialise and reconciles the active backend to whatever
        // the per-user migration state records.
        this._activeBackend = BACKENDS.REALM;
        General.logInfo("GlobalContext", `Initialising bean registry with activeBackend=${this._activeBackend}`);
        this.beanRegistry.init(this.db);

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

        this.reduxStore = appStore.create(this.beanRegistry.beansMap);
        this.beanRegistry.setReduxStore(this.reduxStore);
        const restoreRealmService = this.beanRegistry.getService("backupRestoreRealmService");
        restoreRealmService.subscribeOnRestore(async () => await this.onDatabaseRecreated(realmFactory));
        restoreRealmService.subscribeOnRestoreFailure(async () => await this.reinitializeDatabase(realmFactory));
        await initAnalytics(this.db);

        // After services are wired up, if a migration was interrupted previously,
        // resume it. Fire-and-forget — failures are reported by the migration service itself.
        try {
            const migrationService = this.beanRegistry.getService('sqliteMigrationService');
            if (migrationService) {
                Promise.resolve(migrationService.resumeIfPending()).catch(e => {
                    General.logError("GlobalContext", `resumeIfPending failed: ${e.message}`);
                });
            }
        } catch (e) {
            General.logError("GlobalContext", `Failed to start migration resume: ${e.message}`);
        }
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
        const targetDb = targetBackend === BACKENDS.SQLITE ? this.sqliteDb : this.db;
        General.logInfo("GlobalContext", `Switching backend ${this._activeBackend} → ${targetBackend}`);
        this.beanRegistry.updateDatabase(targetDb);
        this._activeBackend = targetBackend;
    }

    getActiveBackend() {
        return this._activeBackend;
    }

    async onDatabaseRecreated(realmFactory) {
        this.db.close();
        await this.reinitializeDatabase(realmFactory);
    }

    async reinitializeDatabase(realmFactory) {
        this.db = await realmFactory.createRealm();
        updateAnalyticsDatabase(this.db);

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
            General.logWarn("GlobalContext", `SQLite reinit skipped: ${e.message}`);
        }

        // Re-apply the previously active backend choice (preserved across re-init)
        const activeDb = (this._activeBackend === BACKENDS.SQLITE && this.sqliteDb) ? this.sqliteDb : this.db;
        this.beanRegistry.updateDatabase(activeDb);
    }
}

export default GlobalContext;
