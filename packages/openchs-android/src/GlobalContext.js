import BeanRegistry from "./framework/bean/BeanRegistry";
import _ from 'lodash';

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
        return !_.isNil(this.db);
    }

    initialiseGlobalContext(appStore, realmFactory) {
        this.db = realmFactory.createRealm();
        this.beanRegistry.init(this.db);
        this.reduxStore = appStore.create(this.beanRegistry.beansMap);
        this.beanRegistry.setReduxStore(this.reduxStore);
        const restoreRealmService = this.beanRegistry.getService("backupAndRestoreService");
        restoreRealmService.subscribeOnRestore(() => this.onDatabaseRecreated(realmFactory));
    }

    onDatabaseRecreated(realmFactory) {
        this.db.close();
        this.db = realmFactory.createRealm();
        this.beanRegistry.updateDatabase(this.db);
    }
}

export default GlobalContext;
