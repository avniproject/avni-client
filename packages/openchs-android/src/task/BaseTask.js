import _ from "lodash";
import RealmFactory from "../framework/db/RealmFactory";
import BeanRegistry from "../framework/bean/BeanRegistry";
import AppStore from "../store/AppStore";
import GlobalContext from "../GlobalContext";

export default class BaseTask {

    initDependencies() {
        let globalContext = new GlobalContext();
        globalContext.db = RealmFactory.createRealm();
        globalContext.beanRegistry = BeanRegistry;
        BeanRegistry.init(globalContext.db);
        globalContext.reduxStore = AppStore.create(globalContext.beanRegistry.beansMap);
        globalContext.beanRegistry.setReduxStore(globalContext.reduxStore);

        this.setDependencies(globalContext.db, globalContext.beanRegistry)
    }

    setDependencies(db, beans) {
        this.db = db;
        this.beans = beans;
    }

    assertDbPresent() {
        if (_.isNil(this.db)) {
            throw new Error("By now the set dependencies must have called. Something wrong.");
        }
    }

    assertBeansPresent() {
        if (_.isNil(this.beans)) {
            throw new Error("By now the set dependencies must have called. Something wrong.");
        }
    }

    execute() {
        throw new Error("Execute method must be implemented by the scheduled task");
    }
}