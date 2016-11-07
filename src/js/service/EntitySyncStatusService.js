import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import EntitySyncStatus from "../models/EntitySyncStatus";
import _ from "lodash";

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
        var entitySyncStatuses = all.filtered(expression).slice(0, 1);
        if (_.isNil(entitySyncStatuses) || entitySyncStatuses.length === 0) return undefined;
        return entitySyncStatuses[0];
    }
}

export default EntitySyncStatusService;