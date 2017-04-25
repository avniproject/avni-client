import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import EntitySyncStatus from "../models/EntitySyncStatus";
import General from '../utility/General';
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
        const entitySyncStatuses = all.filtered(expression).slice(0, 1);
        if (_.isNil(entitySyncStatuses) || entitySyncStatuses.length === 0) return undefined;
        return entitySyncStatuses[0];
    }

    setup(entityMetaDataModel) {
        const self = this;

        entityMetaDataModel.forEach(function(entity) {
            if (_.isNil(self.get(entity.entityName))) {
                General.logDebug('EntitySyncStatusService', `Setting up base entity sync status for ${entity.entityName}`);
                try {
                    const entitySyncStatus = EntitySyncStatus.create(entity.entityName, EntitySyncStatus.REALLY_OLD_DATE, General.randomUUID());
                    self.save(entitySyncStatus);
                } catch (e) {
                    General.logError('EntitySyncStatusService', `${entity.entityName} failed`);
                    throw e;
                }
            }
        });
    }
}

export default EntitySyncStatusService;