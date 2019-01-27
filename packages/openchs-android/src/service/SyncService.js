import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";
import {EntitySyncStatus, UserInfo} from "openchs-models";
import _ from "lodash";
import EntityQueueService from "./EntityQueueService";
import MessageService from "./MessageService";
import AuthService from "./AuthService";
import UserInfoService from "./UserInfoService";
import RuleEvaluationService from "./RuleEvaluationService";
import MediaQueueService from "./MediaQueueService";

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
        this.userInfoService = this.getService(UserInfoService);
        this.ruleEvaluationService = this.getService(RuleEvaluationService);
        this.mediaQueueService = this.getService(MediaQueueService);
    }

    authenticate() {
        return this.authService.getAuthToken();
    }

    sync(allEntitiesMetaData) {
        const firstDataServerSync = this.dataServerSync(allEntitiesMetaData);

        const mediaUploadRequired = this.mediaQueueService.isMediaUploadRequired();
        //Even blank dataServerSync with no data in or out takes quite a while.
        // Don't do it twice if no image sync required
        return mediaUploadRequired ?
            firstDataServerSync
                .then(() => this.imageSync(allEntitiesMetaData))
                .then(() => this.dataServerSync(allEntitiesMetaData))
            : firstDataServerSync;
    }

    imageSync() {
        return this.authenticate()
            .then((idToken) => this.mediaQueueService.uploadMedia(idToken));
    }

    dataServerSync(allEntitiesMetaData) {
        // CREATE FAKE DATA
        // this.getService(FakeDataService).createFakeScheduledEncountersFor(700);
        // this.getService(FakeDataService).createFakeOverdueEncountersFor(700);
        // this.getService(FakeDataService).createFakeCompletedEncountersFor(700);
        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");
        return this.authenticate()
            .then((idToken) => this.conventionalRestClient.setToken(idToken))
            .then(() => this.getUserInfo())
            .then(() => this.pushTxData(allTxEntityMetaData.slice()))
            .then(() => this.getData(allReferenceDataMetaData))
            .then(() => this.getData(allTxEntityMetaData));
    }

    getUserInfo() {
        const settings = this.settingsService.getSettings();
        return this.conventionalRestClient.getUserInfo(this.persistUserInfo.bind(this));
    }

    persistUserInfo(userInfoResource) {
        return this.userInfoService.saveOrUpdate(UserInfo.fromResource(userInfoResource));
    }

    getData(entitiesMetadata) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => Object.assign({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
                ...entityMetadata
            }));
        return this.conventionalRestClient.getAll(entitiesMetaDataWithSyncStatus, this.persistAll.bind(this));
    }

    persistAll(entityMetaData, entityResources) {
        if (_.isEmpty(entityResources)) return;
        const entityService = this.getService(EntityService);
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const entities = entityResources.reduce((acc, entity) => acc.concat([entityMetaData.entityClass.fromResource(entity, entityService, acc)]), []);
        let entitiesToCreateFns = this.createEntities(entityMetaData.entityName, entities);
        if (entityMetaData.nameTranslated) {
            entityResources.map((entity) => this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue));
        }
        //most openchs-models are designed to have oneToMany relations
        //Each model has a static method `associateChild` implemented in manyToOne fashion
        //`<A Model>.associateChild()` method takes childInformation, finds the parent, assigns the child to the parent and returns the parent
        //`<A Model>.associateChild()` called many times as many children
        if (!_.isEmpty(entityMetaData.parent)) {
            const parentEntities = _.zip(entityResources, entities)
                .map(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChild(entity, entityMetaData.entityClass, entityResource, entityService));
            const mergedParentEntities =
                _.values(_.groupBy(parentEntities, 'uuid'))
                    .map(entityMetaData.parent.entityClass.merge(entityMetaData.entityClass));
            entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityMetaData.parent.entityName, mergedParentEntities));
        }

        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName);

        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.name = entityMetaData.entityName;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(_.last(entityResources)["lastModifiedDateTime"]);
        this.bulkSaveOrUpdate(entitiesToCreateFns.concat(this.createEntities(EntitySyncStatus.schema.name, [entitySyncStatus])));
    }

    pushTxData(allTxEntityMetaData) {
        const entityQueueService = this.getService(EntityQueueService);
        const entitiesToPost = allTxEntityMetaData.reverse()
            .map(entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));
        return this.conventionalRestClient.postAllEntities(entitiesToPost, entityQueueService.popItem);
    }
}

export default SyncService;