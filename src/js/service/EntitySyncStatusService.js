import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import EntitySyncStatus from "../models/EntitySyncStatus";

@Service("entitySyncStatusService")
class EntitySyncStatusService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return EntitySyncStatus.schema.name;
    }

    get(entityName) {
        const all = this.db.objects(EntitySyncStatus.schema.name);
        const expression = `entityName = \"${entityName}\"`;
        return all.filtered(expression).slice(0, 1);
    }
}

export default EntitySyncStatusService;