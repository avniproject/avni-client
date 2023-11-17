import BeanRegistry from "./framework/bean/BeanRegistry";
import _ from 'lodash';
import {initAnalytics, updateAnalyticsDatabase} from "./utility/Analytics";

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
        this.beanRegistry.init(this.db);
        this.reduxStore = appStore.create(this.beanRegistry.beansMap);
        this.beanRegistry.setReduxStore(this.reduxStore);
        const restoreRealmService = this.beanRegistry.getService("backupAndRestoreService");
        restoreRealmService.subscribeOnRestore(async () => await this.onDatabaseRecreated(realmFactory));
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
