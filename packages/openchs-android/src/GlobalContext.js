import BeanRegistry from "./framework/bean/BeanRegistry";
import _ from 'lodash';
import {initAnalytics, updateAnalyticsDatabase} from "./utility/Analytics";
import General from "./utility/General";

let singleton;

class GlobalContext {
    db;
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
        this.db =  await realmFactory.createRealm();

        // Initialize SQLite DB alongside Realm (Phase 2 — both coexist)
        try {
            const SqliteFactory = require("./framework/db/SqliteFactory").default;
            this.sqliteDb = await SqliteFactory.createSqliteDb();
            General.logInfo("GlobalContext", "SQLite database initialized");
        } catch (e) {
            General.logWarn("GlobalContext", `SQLite init skipped: ${e.message}`);
        }

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
    }

    async onDatabaseRecreated(realmFactory) {
        this.db.close();
        await this.reinitializeDatabase(realmFactory);
    }

    async reinitializeDatabase(realmFactory) {
        this.db = await realmFactory.createRealm();
        this.beanRegistry.updateDatabase(this.db);
        updateAnalyticsDatabase(this.db);

        // Recreate SQLite DB alongside Realm
        if (this.sqliteDb) {
            try {
                this.sqliteDb.close();
            } catch (e) {
                General.logWarn("GlobalContext", `SQLite close error: ${e.message}`);
            }
        }
        try {
            const SqliteFactory = require("./framework/db/SqliteFactory").default;
            this.sqliteDb = await SqliteFactory.createSqliteDb();
        } catch (e) {
            General.logWarn("GlobalContext", `SQLite reinit skipped: ${e.message}`);
        }
    }
}

export default GlobalContext;
