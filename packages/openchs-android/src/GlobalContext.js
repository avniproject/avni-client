import BeanRegistry from "./framework/bean/BeanRegistry";
import _ from 'lodash';
import {initAnalytics, updateAnalyticsDatabase} from "./utility/Analytics";
import Perf from "./utility/perf";

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
        // avni-client#2084 instrumentation: on a large realm this is the dominant part of a cold start
        // and it scales with data size, unlike the dev-bundle fetch which does not exist in a release build.
        const _t0 = Date.now();
        this.db =  await realmFactory.createRealm();
        Perf.mark("startup.realmOpen", {ms: Date.now() - _t0});
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
    }
}

export default GlobalContext;
