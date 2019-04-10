import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";
import { EntitySyncStatus, SyncTelemetry } from 'openchs-models';
import EntityQueueService from "./EntityQueueService";
import MessageService from "./MessageService";
import AuthService from "./AuthService";
import RuleEvaluationService from "./RuleEvaluationService";
import MediaQueueService from "./MediaQueueService";
import ProgressbarStatus from "./ProgressbarStatus";
import {SyncActionNames as SyncActions, SyncActionNames as Actions} from "../action/SyncActions";
import _ from "lodash";

@Service("syncService")
class SyncService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.persistAll = this.persistAll.bind(this);
    }

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.entityService = this.getService(EntityService);
        this.conventionalRestClient = new ConventionalRestClient(this.getService(SettingsService));
        this.messageService = this.getService(MessageService);
        this.authService = this.getService(AuthService);
        this.ruleEvaluationService = this.getService(RuleEvaluationService);
        this.mediaQueueService = this.getService(MediaQueueService);
        this.entityQueueService = this.getService(EntityQueueService);
    }

    authenticate() {
        return this.authService.getAuthToken();
    }

    getProgressSteps(allEntitiesMetaData) {
        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");

        const entitiesToPost = allTxEntityMetaData
            .map(this.entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities)).map((it) => it.metaData.entityName + ".PUSH");

        const steps = _.concat(
            allReferenceDataMetaData.map((entityMetaData) => entityMetaData.entityName + ".PULL"),
            allTxEntityMetaData.map((entityMetaData) => entityMetaData.entityName + ".PULL"),
            entitiesToPost
        );

        return this.mediaQueueService.isMediaUploadRequired()
            ? _.concat(
                steps,
                ['Media', 'After_Media.Push'],
                allTxEntityMetaData.map((entityMetaData) => entityMetaData.entityName + ".PULL")
            )
            : steps;
    }

    sync(allEntitiesMetaData, trackProgress, statusMessageCallBack = _.noop) {

        const onProgressPerEntity = (entityType) => progressBarStatus.onComplete(entityType);
        const onAfterMediaPush = (entityType) => progressBarStatus.onComplete(entityType);

        const firstDataServerSync = this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, _.noop);

        const mediaUploadRequired = this.mediaQueueService.isMediaUploadRequired();
        const progressBarStatus = new ProgressbarStatus(trackProgress, this.getProgressSteps(allEntitiesMetaData));

        this.dispatchAction(Actions.START_SYNC);

        //Even blank dataServerSync with no data in or out takes quite a while.
        // Don't do it twice if no image sync required
        return mediaUploadRequired ?
            firstDataServerSync
                .then(() => this.imageSync(statusMessageCallBack).then(() => onAfterMediaPush('Media')))
                .then(() => this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush))
                .then(() => this.dispatchAction(SyncActions.SYNC_COMPLETED))
                .then(() => this.telemetrySync(allEntitiesMetaData, onProgressPerEntity))
            : firstDataServerSync
                .then(() => this.dispatchAction(SyncActions.SYNC_COMPLETED))
                .then(() => this.telemetrySync(allEntitiesMetaData, onProgressPerEntity));
    }

    imageSync(statusMessageCallBack) {
        return this.authenticate()
            .then((idToken) => {
                statusMessageCallBack("uploadMedia");
                return idToken;
            })
            .then((idToken) => this.mediaQueueService.uploadMedia(idToken));
    }

    telemetrySync(allEntitiesMetaData, onProgressPerEntity) {
        const telemetryMetadata = allEntitiesMetaData.filter(entityMetadata => entityMetadata.entityName === SyncTelemetry.schema.name);
        const onCompleteOfIndividualPost = (entityMetadata, entityUUID) => this.entityQueueService.popItem(entityUUID)();
        const entitiesToPost = telemetryMetadata.reverse()
            .map(this.entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));
        return this.authenticate()
            .then((idToken) => this.conventionalRestClient.setToken(idToken))
            .then(() => this.conventionalRestClient.postAllEntities(entitiesToPost, onCompleteOfIndividualPost, onProgressPerEntity))
    }

    dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush) {

        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");

        return this.authenticate()
            .then((idToken) => this.conventionalRestClient.setToken(idToken))

            .then(() => statusMessageCallBack("uploadLocallySavedData"))
            .then(() => this.pushData(allTxEntityMetaData.slice(), onProgressPerEntity))
            .then(() => onAfterMediaPush("After_Media.Push"))

            .then(() => statusMessageCallBack("downloadForms"))
            .then(() => this.getData(allReferenceDataMetaData, onProgressPerEntity))

            .then(() => statusMessageCallBack("downloadNewDataFromServer"))
            .then(() => this.getData(allTxEntityMetaData, onProgressPerEntity))

    }

    getData(entitiesMetadata, afterAllInEachTypePulled) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => Object.assign({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
                ...entityMetadata
            }));

        const onGetOfFirstPage = (entityName, page) =>
            this.dispatchAction(Actions.RECORD_FIRST_PAGE_OF_PULL, {entityName, totalElements: page.totalElements});

        return this.conventionalRestClient.getAll(entitiesMetaDataWithSyncStatus, this.persistAll, onGetOfFirstPage, afterAllInEachTypePulled);
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

        this.dispatchAction(Actions.ENTITY_PULL_COMPLETED, {entityName: entityMetaData.entityName, numberOfPulledEntities: entities.length});
    }

    pushData(allTxEntityMetaData, afterEachEntityTypePushed) {
        const entitiesToPost = allTxEntityMetaData.reverse()
            .map(this.entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));

        this.dispatchAction(Actions.RECORD_PUSH_TODO_TELEMETRY, {entitiesToPost});

        const onCompleteOfIndividualPost = (entityMetadata, entityUUID) => {
            return () => {
                this.dispatchAction(Actions.ENTITY_PUSH_COMPLETED, {entityMetadata});
                return this.entityQueueService.popItem(entityUUID)();
            }
        };

        return this.conventionalRestClient.postAllEntities(entitiesToPost, onCompleteOfIndividualPost, afterEachEntityTypePushed);
    }
}

export default SyncService;
