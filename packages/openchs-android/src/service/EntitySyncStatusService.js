import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntitySyncStatus} from "openchs-models";
import General from '../utility/General';
import _ from "lodash";
import EntityQueueService from "./EntityQueueService";

@Service("entitySyncStatusService")
class EntitySyncStatusService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.get = this.get.bind(this);
    }

    getSchema() {
        return EntitySyncStatus.schema.name;
    }

    get(entityName) {
        return this.db.objects(EntitySyncStatus.schema.name)
            .filtered("entityName = $0", entityName)
            .slice()[0];
    }

    geAllSyncStatus() {
        const syncStatusList = this.findAll(EntitySyncStatus.schema.name);
        const entityQueueService = this.getService(EntityQueueService);
        return _.chain(syncStatusList).map((entitySyncStatus)=> {
            return ({
                entityName: entitySyncStatus.entityName,
                loadedSince: entitySyncStatus.loadedSince,
                queuedCount: entityQueueService.getQueuedItemCount(entitySyncStatus.entityName)
            });
        }).sortBy((entitySyncStatus)=>entitySyncStatus.entityName).value();
    }

    getLastLoaded() {
        return _.max(this.findAll(EntitySyncStatus.schema.name)
            .map((entitySyncStatus)=>entitySyncStatus.loadedSince));
    }

    setup(entityMetaDataModel) {
        const self = this;

        entityMetaDataModel.forEach(function (entity) {
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