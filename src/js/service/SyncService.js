import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";
import EntitySyncStatus from "../models/EntitySyncStatus";
import _ from "lodash";
import EntityQueueService from "./EntityQueueService";
import ConfigFileService from "./ConfigFileService";
import MessageService from "./MessageService";
import General from "../utility/General";

@Service("syncService")
class SyncService extends BaseService {
    //Push all tx data
    //Check app updates
    //Pull metadata
    //Pull configuration
    //Pull txdata for the catchment

    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.entityService = this.getService(EntityService);
        this.conventionalRestClient = new ConventionalRestClient(this.getService(SettingsService));
        this.configFileService = this.getService(ConfigFileService);
        this.messageService = this.getService(MessageService);
    }

    sync(allEntitiesMetaData, start, done, onError) {
        start();
        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");

        const pullTxDataFn = () => this.pullData(allTxDataMetaData, done, onError);
        const pullConfigurationFn = () => this.pullConfiguration(pullTxDataFn, onError);
        const pullReferenceDataFn = () => this.pullData(allReferenceDataMetaData, pullConfigurationFn, onError);
        this.pushTxData(allTxDataMetaData.slice(), pullReferenceDataFn, onError);
    }

    pullConfiguration(onComplete, onError) {
        this.configFileService.getAllFilesAndSave(onComplete, onError);
    }

    pullData(unprocessedEntityMetaData, onComplete, onError) {
        const entityMetaData = unprocessedEntityMetaData.pop();
        if (_.isNil(entityMetaData)) {
            onComplete();
            return;
        }

        const entitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName);
        General.logInfo('SyncService', `${entitySyncStatus.entityName} was last loaded up to "${entitySyncStatus.loadedSince}"`);
        this.conventionalRestClient.loadData(entityMetaData, entitySyncStatus.loadedSince, 0,
            unprocessedEntityMetaData,
            (resourcesWithSameTimeStamp, entityModel) => this.persist(resourcesWithSameTimeStamp, entityModel),
            (workingAllEntitiesMetaData) => this.pullData(workingAllEntitiesMetaData, onComplete, onError),
            [], onError);
    }

    persist(resourcesWithSameTimeStamp, entityModel) {
        resourcesWithSameTimeStamp.forEach((resource) => {
            const entity = entityModel.entityClass.fromResource(resource, this.getService(EntityService));
            this.entityService.saveOrUpdate(entity, entityModel.entityName);
            if (entityModel.nameTranslated) {
                this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue);
            }

            if (!_.isNil(entityModel.parent)) {
                const parentEntity = entityModel.parent.entityClass.associateChild(entity, entityModel.entityClass, resource, this.getService(EntityService));
                this.entityService.saveOrUpdate(parentEntity, entityModel.parent.entityName);
            }
        });

        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityModel.entityName);

        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.name = entityModel.entityName;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(resourcesWithSameTimeStamp[0]["lastModifiedDateTime"]);
        this.entitySyncStatusService.saveOrUpdate(entitySyncStatus);
    }

    pushTxData(allTxDataMetaData, onComplete, onError) {
        const entityQueueService = this.getService(EntityQueueService);
        const entitiesToPost = allTxDataMetaData.reverse()
            .map(entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));
        this.conventionalRestClient.postAllEntities(entitiesToPost, onComplete, onError, entityQueueService.popItem);
    }
}

export default SyncService;