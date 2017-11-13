import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";
import {EntitySyncStatus} from "openchs-models";
import _ from "lodash";
import EntityQueueService from "./EntityQueueService";
import MessageService from "./MessageService";
import AuthService from "./AuthService";

@Service("syncService")
class SyncService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.entityService = this.getService(EntityService);
        this.settingsService = this.getService(SettingsService);
        this.conventionalRestClient = new ConventionalRestClient(this.settingsService);
        this.messageService = this.getService(MessageService);
        this.authService = this.getService(AuthService);
    }

    authenticate() {
        return this.authService.getAuthToken();
    }

    sync(allEntitiesMetaData) {
        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");

        return this.authenticate()
            .then((idToken) => this.conventionalRestClient.setToken(idToken))
            .then(() => this.pushTxData(allTxDataMetaData.slice()))
            .then(() => this.getData(allReferenceDataMetaData))
            .then(() => this.getData(allTxDataMetaData));
    }

    getData(entitiesMetadata) {
        const entitiesSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => Object.assign({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
                ...entityMetadata
            }));
        return this.conventionalRestClient.getAll(entitiesSyncStatus, this.persistAll.bind(this));
    }

    persistAll(entityModel, entityResources) {
        if (_.isEmpty(entityResources)) return;
        const entityService = this.getService(EntityService);
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const entities = entityResources.map((entity) => entityModel.entityClass.fromResource(entity, entityService));
        let entitiesToCreateFns = this.createEntities(entityModel.entityName, entities);
        if (entityModel.nameTranslated) {
            entityResources.map((entity) => this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue));
        }
        if (!_.isEmpty(entityModel.parent)) {
            const parentEntities = _.zip(entityResources, entities)
                .map(([entityResource, entity]) => entityModel.parent.entityClass.associateChild(entity, entityModel.entityClass, entityResource, entityService));
            const mergedParentEntities =
                _.values(_.groupBy(parentEntities, 'uuid'))
                    .map(entityModel.parent.entityClass.merge(entityModel.entityClass));
            entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityModel.parent.entityName, mergedParentEntities));
        }

        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityModel.entityName);

        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.name = entityModel.entityName;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(_.last(entityResources)["lastModifiedDateTime"]);
        this.bulkSaveOrUpdate(entitiesToCreateFns.concat(this.createEntities(EntitySyncStatus.schema.name, [entitySyncStatus])));
    }

    pushTxData(allTxDataMetaData) {
        const entityQueueService = this.getService(EntityQueueService);
        const entitiesToPost = allTxDataMetaData.reverse()
            .map(entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));
        return this.conventionalRestClient.postAllEntities(entitiesToPost, entityQueueService.popItem);
    }
}

export default SyncService;