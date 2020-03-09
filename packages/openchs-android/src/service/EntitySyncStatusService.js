import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntitySyncStatus, EntityMetaData, GroupPrivileges} from 'avni-models';
import General from '../utility/General';
import _ from "lodash";
import EntityQueueService from "./EntityQueueService";
import moment from "moment";
import MediaQueueService from "./MediaQueueService";
import PrivilegeService from "./PrivilegeService";

@Service("entitySyncStatusService")
class EntitySyncStatusService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.get = this.get.bind(this);
    }

    findAll() {
        return super.findAll(this.getSchema());
    }

    getSchema() {
        return EntitySyncStatus.schema.name;
    }

    get(entityName, entityTypeUuid) {
        return this.db.objects(EntitySyncStatus.schema.name)
            .filtered("entityName = $0", entityName)
            .filtered(_.isEmpty(entityTypeUuid) ? 'uuid<>null' : 'entityTypeUuid = $0', entityTypeUuid);
    }

    geAllSyncStatus() {
        const entityQueueService = this.getService(EntityQueueService);
        const entities = _.map(this.findAll(), entitySyncStatus => {
            return {
                entityName: entitySyncStatus.entityName,
                loadedSince: moment(entitySyncStatus.loadedSince).format("DD-MM-YYYY HH:MM:SS"),
                queuedCount: entityQueueService.getQueuedItemCount(entitySyncStatus.entityName),
                type: EntityMetaData.findByName(entitySyncStatus.entityName).type
            }
        });
        const mediaQueueService = this.getService(MediaQueueService);
        const mediaGroups = _.groupBy(mediaQueueService.findAll(), 'type');
        const mediaEntities = _.map(mediaGroups, (list, mediaType) => ({
            entityName: 'Media ' + mediaType,
            loadedSince: '',
            queuedCount: list.length,
            type: 'tx'
        }));

        return _.concat(entities, mediaEntities);

    }

    getLastLoaded() {
        return moment(_.max(this.findAll(EntitySyncStatus.schema.name)
            .map((entitySyncStatus) => entitySyncStatus.loadedSince))).format("DD-MM-YYYY HH:MM:SS");
    }

    setup(entityMetaDataModel) {
        const self = this;

        entityMetaDataModel.forEach(function (entity) {
            if (_.isNil(self.get(entity.entityName)) && _.isEmpty(entity.privilegeParam)) {
                General.logDebug('EntitySyncStatusService', `Setting up base entity sync status for ${entity.entityName}`);
                try {
                    const entitySyncStatus = EntitySyncStatus.create(entity.entityName, EntitySyncStatus.REALLY_OLD_DATE, General.randomUUID(), '');
                    self.save(entitySyncStatus);
                } catch (e) {
                    General.logError('EntitySyncStatusService', `${entity.entityName} failed`);
                    throw e;
                }
            } else {
                self.updateEntitySyncStatusWithNewPrivileges(entityMetaDataModel);
            }
        });
    }

    resetSyncForEntity(criteriaQuery, db) {
        db.write(() => {
            const objects = this.findAllByCriteria(criteriaQuery);
            db.delete(objects);
        });
    }

    updateEntitySyncStatusWithNewPrivileges(entityMetaDataModel) {
        entityMetaDataModel.forEach(entity => {
            if (entity.privilegeParam) {
                const {privilegeEntity, privilegeName, privilegeParam, entityName} = entity;
                const entityTypeUUIDs = this.getService(PrivilegeService).getEntityTypeUuidListForMetadata(privilegeEntity, privilegeName, privilegeParam, true);
                const presentEntityTypeUUIDs = this.findAllByCriteria(`entityTypeUuid <> null && entityName = '${entityName}'`)
                    .map(entitySyncStatus => entitySyncStatus.entityTypeUuid);
                const EntityTypeUUIDsToBeAdded = _.difference(entityTypeUUIDs, presentEntityTypeUUIDs);
                _.forEach(EntityTypeUUIDsToBeAdded, uuid => {
                    try {
                        const entitySyncStatus = EntitySyncStatus.create(entityName, EntitySyncStatus.REALLY_OLD_DATE, General.randomUUID(), uuid);
                        this.save(entitySyncStatus);
                    } catch (e) {
                        General.logError('EntitySyncStatusService', ` entityName : ${entity.entityName} entityTypeUuid: ${uuid} failed`);
                        throw e;
                    }
                })
            }
        })
    }

}

export default EntitySyncStatusService;
