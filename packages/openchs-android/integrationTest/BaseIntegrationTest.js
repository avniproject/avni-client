import GlobalContext from "../src/GlobalContext";
import EntityService from "../src/service/EntityService";

class BaseIntegrationTest {
    getService(nameOrType) {
        return GlobalContext.getInstance().beanRegistry.getService(nameOrType);
    }

    getEntityService() {
        return GlobalContext.getInstance().beanRegistry.getService(EntityService);
    }

    saveEntity(entity, entityClass) {
        this.getEntityService().save(entity, entityClass.schema.name);
        return this.getEntityService().findByUUID(entity.uuid, entityClass.schema.name);
    }

    dispatch(actionName, ...params) {
        return GlobalContext.getInstance().reduxStore.dispatch(actionName, params);
    }
}

export default BaseIntegrationTest;
