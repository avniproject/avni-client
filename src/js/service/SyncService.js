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

        const pullTxDataFn = () => this.getData(allTxDataMetaData, done, onError);
        const pullConfigurationFn = () => this.pullConfiguration(pullTxDataFn, onError);
        const pullReferenceDataFn = () => this.getData(allReferenceDataMetaData, pullConfigurationFn, onError);
        this.pushTxData(allTxDataMetaData.slice(), pullReferenceDataFn, onError);
    }

    pullConfiguration(onComplete, onError) {
        this.configFileService.getAllFilesAndSave(onComplete, onError);
    }

    getData(entitiesMetadata, onComplete, onError) {
        const entitiesSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => Object.assign({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
                ...entityMetadata
            }));
        this.conventionalRestClient.getAll(entitiesSyncStatus, this.persistAll.bind(this), onComplete, onError)
    }

    persistAll(entityModel, entityResources) {
        if (_.isEmpty(entityResources)) return;
        const entityService = this.getService(EntityService);
        const entities = entityResources.map((entity) => entityModel.entityClass.fromResource(entity, entityService));
        let entitiesToCreateFns = this.createEntities(entityModel.entityName, entities);
        if (entityModel.nameTranslated) {
            entityResources.map((entity) => this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue));
        }
        if (!_.isEmpty(entityModel.parent)) {
            const parentEntities = _.zip(entityResources, entities).map(([entityResource, entity]) => entityModel.parent.entityClass.associateChild(entity, entityModel.entityClass, entityResource, entityService));
            entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityModel.parent.entityName, parentEntities));
        }

        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityModel.entityName);

        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.name = entityModel.entityName;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(_.last(entityResources)["lastModifiedDateTime"]);
        this.bulkSaveOrUpdate(entitiesToCreateFns.concat(this.createEntities(EntitySyncStatus.schema.name, [entitySyncStatus])));
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