import BeanRegistry from "./framework/bean/BeanRegistry";
import _ from 'lodash';
import {initAnalytics, updateAnalyticsDatabase} from "./utility/Analytics";
import General from "./utility/General";

const USE_SQLITE = false;

let singleton;

class GlobalContext {
    db;
    sqliteDb;
    beanRegistry;
    routes;
    reduxStore;

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

        // RepositoryFactory and services use the active backend
        const activeDb = USE_SQLITE ? this.sqliteDb : this.db;
        this.beanRegistry.init(activeDb);

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

        const activeDb = USE_SQLITE ? this.sqliteDb : this.db;
        this.beanRegistry.updateDatabase(activeDb);
    }
}

export default GlobalContext;
