import GlobalContext from "../src/GlobalContext";
import EntityService from "../src/service/EntityService";
import RuleEvaluationService from "../src/service/RuleEvaluationService";
import ProgramConfigService from "../src/service/ProgramConfigService";
import MessageService from "../src/service/MessageService";
import RuleService from "../src/service/RuleService";
import PrivilegeService from "../src/service/PrivilegeService";

const TesterProxyHandler = {
    setContext: function (context) {
        this.context = context;
        return this;
    },

    get: function (target, name) {
        // console.log("TesterProxyHandler", name);
        if (typeof name !== 'symbol' && !isNaN(name) && !isNaN(parseInt(name))) {
            return target.getAt(Number.parseInt(name));
        } else if (name === "length") {
            return target.getLength();
        }
        return Reflect.get(...arguments);
    }
}

class BaseIntegrationTest {
    tester(context) {
        return new Proxy(this, TesterProxyHandler.setContext(context));
    }

    getService(nameOrType) {
        return GlobalContext.getInstance().beanRegistry.getService(nameOrType);
    }

    getEntityService() {
        return GlobalContext.getInstance().beanRegistry.getService(EntityService);
    }

    dispatch(actionName, ...params) {
        return GlobalContext.getInstance().reduxStore.dispatch(actionName, params);
    }

    executeInWrite(codeBlock) {
        GlobalContext.getInstance().db.write(() => {
            codeBlock(new TestDb(GlobalContext.getInstance().db));
        });
    }

    getState(reducerKey) {
        return GlobalContext.getInstance().reduxStore.getState()[reducerKey];
    }

    initialDataSetupComplete() {
        // SyncComponent.reset
        this.getService(RuleEvaluationService).init();
        this.getService(ProgramConfigService).init();
        this.getService(MessageService).init();
        this.getService(RuleService).init();
        this.getService(PrivilegeService).deleteRevokedEntities();
    }

    setup() {
        GlobalContext.getInstance().db.write(() => {
            GlobalContext.getInstance().db.realmDb.deleteAll();
        });
        return this;
    }
}

class TestDb {
    constructor(db) {
        this.db = db;
    }

    create(clazz, entity) {
        return this.db.create(clazz.schema.name, entity);
    }
}

export default BaseIntegrationTest;
