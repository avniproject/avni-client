import GlobalContext from "../src/GlobalContext";
import EntityService from "../src/service/EntityService";
import RuleEvaluationService from "../src/service/RuleEvaluationService";
import ProgramConfigService from "../src/service/ProgramConfigService";
import MessageService from "../src/service/MessageService";
import RuleService from "../src/service/RuleService";
import PrivilegeService from "../src/service/PrivilegeService";
import General from "../src/utility/General";
import _ from "lodash";

class BaseIntegrationTest {
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

    log(...params) {
        console["debug"]("\x1b[43m\x1b[30m%s\x1b[0m", ...params);
    }

    getEntity(type, uuid) {
        return this.getEntityService().findByUUID(uuid, type.schema.name);
    }

    getAllEntities(type) {
        return this.getEntityService().findAll(type.schema.name);
    }
}

class TestDb {
    constructor(db) {
        this.db = db;
    }

    create(clazz, entity, overwrite = true) {
        console["debug"]("Creating object of type", clazz.schema.name, " with overwrite:", overwrite);
        return this.db.create(clazz.schema.name, entity, overwrite);
    }
}

export default BaseIntegrationTest;
