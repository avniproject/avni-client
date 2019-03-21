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
import ProgressbarStatus from "./ProgressbarStatus";

@Service("syncService")
class SyncService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.entityService = this.getService(EntityService);
        this.conventionalRestClient = new ConventionalRestClient(this.getService(SettingsService));
        this.messageService = this.getService(MessageService);
        this.authService = this.getService(AuthService);
        this.userInfoService = this.getService(UserInfoService);
        this.ruleEvaluationService = this.getService(RuleEvaluationService);
        this.mediaQueueService = this.getService(MediaQueueService);
    }

    authenticate() {
        return this.authService.getAuthToken();
    }

    sync(allEntitiesMetaData, trackProgress, statusMessageCallBack = _.noop) {


        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");
        const userMetadata = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "user");

        const entityQueueService = this.getService(EntityQueueService);
        const entitiesToPost = allTxEntityMetaData
            .map(entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities)).map((it) => it.entityName + ".PUSH");

        const usersToPost = userMetadata
            .map(entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities)).map((it) => it.entityName + ".PUSH");

        const steps = _.concat(allReferenceDataMetaData.map((entityMetaData) => entityMetaData.entityName + ".PULL"),
            allTxEntityMetaData.map((entityMetaData) => entityMetaData.entityName + ".PULL"),
            entitiesToPost,
            userMetadata.map((entityMetaData) => entityMetaData.entityName + ".PULL"),
            usersToPost);

        const progressBarStatus = new ProgressbarStatus(trackProgress, steps);

        const onProgressPerEntity = (entityType) => progressBarStatus.onComplete(entityType);

        const firstDataServerSync = this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity);

        const mediaUploadRequired = this.mediaQueueService.isMediaUploadRequired();
        //Even blank dataServerSync with no data in or out takes quite a while.
        // Don't do it twice if no image sync required
        return mediaUploadRequired ?
            firstDataServerSync
                .then(() => this.imageSync(statusMessageCallBack).then(() => onProgressPerEntity('Media')))
                .then(() => this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity))
            : firstDataServerSync;
    }

    imageSync(statusMessageCallBack) {
        return this.authenticate()
            .then((idToken) => {
                statusMessageCallBack("uploadMedia");
                return idToken;
            })
            .then((idToken) => this.mediaQueueService.uploadMedia(idToken));
    }

    dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity) {

        // CREATE FAKE DATA
        // this.getService(FakeDataService).createFakeScheduledEncountersFor(700);
        // this.getService(FakeDataService).createFakeOverdueEncountersFor(700);
        // this.getService(FakeDataService).createFakeCompletedEncountersFor(700);
        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");
        const userMetadata = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "user");
        return this.authenticate()
            .then((idToken) => this.conventionalRestClient.setToken(idToken))

            .then(() => statusMessageCallBack("uploadLocallySavedData"))
            .then(() => this.pushTxData(allTxEntityMetaData.slice(), onProgressPerEntity))
            .then(() => this.pushTxData(userMetadata.slice(), onProgressPerEntity))

            .then(() => statusMessageCallBack("downloadForms"))
            .then(() => this.getUserInfo(onProgressPerEntity))
            .then(() => this.getData(allReferenceDataMetaData, onProgressPerEntity))

            .then(() => statusMessageCallBack("downloadNewDataFromServer"))
            .then(() => this.getData(allTxEntityMetaData, onProgressPerEntity))

    }

    getUserInfo(onProgressPerEntity) {
        return this.conventionalRestClient.getUserInfo().then(this.persistUserInfo.bind(this)).then(() => onProgressPerEntity('UserInfo.PULL'));
    }

    persistUserInfo(userInfoResource) {
        const entityService = this.getService(EntityService);
        return this.userInfoService.saveOrUpdate(UserInfo.fromResource(userInfoResource, entityService));
    }

    getData(entitiesMetadata, afterAllInEachTypePulled) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => Object.assign({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
                ...entityMetadata
            }));
        return this.conventionalRestClient.getAll(entitiesMetaDataWithSyncStatus, this.persistAll.bind(this), afterAllInEachTypePulled);
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

    pushUserData(userMetadata, afterUserDataPushed) {
        return this.pushTxData(userMetadata, afterUserDataPushed);
    }


    pushTxData(allTxEntityMetaData, afterEachEntityTypePushed) {
        const entityQueueService = this.getService(EntityQueueService);
        const entitiesToPost = allTxEntityMetaData.reverse()
            .map(entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));
        return this.conventionalRestClient.postAllEntities(entitiesToPost, entityQueueService.popItem, afterEachEntityTypePushed);
    }
}

export default SyncService;
