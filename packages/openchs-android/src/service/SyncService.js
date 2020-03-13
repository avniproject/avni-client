import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";
import {EntityMetaData, EntitySyncStatus, RuleFailureTelemetry, SyncTelemetry} from 'avni-models';
import EntityQueueService from "./EntityQueueService";
import MessageService from "./MessageService";
import AuthService from "./AuthService";
import RuleEvaluationService from "./RuleEvaluationService";
import MediaQueueService from "./MediaQueueService";
import ProgressbarStatus from "./ProgressbarStatus";
import {SyncTelemetryActionNames as SyncTelemetryActions} from "../action/SyncTelemetryActions";
import _ from "lodash";
import RuleService from "./RuleService";
import PrivilegeService from "./PrivilegeService";

@Service("syncService")
class SyncService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.persistAll = this.persistAll.bind(this);
    }

    getFormattedMetadata(metadata, reduceWeightBy) {
        return _.map(metadata, (data) => ({
            name: data.entityName,
            syncWeight: data.syncWeight / reduceWeightBy
        }))
    }

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.entityService = this.getService(EntityService);
        this.conventionalRestClient = new ConventionalRestClient(this.getService(SettingsService), this.getService(PrivilegeService));
        this.messageService = this.getService(MessageService);
        this.authService = this.getService(AuthService);
        this.ruleEvaluationService = this.getService(RuleEvaluationService);
        this.mediaQueueService = this.getService(MediaQueueService);
        this.entityQueueService = this.getService(EntityQueueService);
        this.ruleService = this.getService(RuleService);
    }

    authenticate() {
        return this.authService.getAuthToken();
    }

    getProgressSteps(allEntitiesMetaData) {
        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");

        if (this.mediaQueueService.isMediaUploadRequired()) {
            //entities will be used two times during sync
            const txMetaData = this.getFormattedMetadata(allTxEntityMetaData, 2);
            //entities will be used three times during sync
            const queuedItems = allTxEntityMetaData
                .map(this.entityQueueService.getAllQueuedItems)
                .filter((entities) => !_.isEmpty(entities.entities)).map((it) => ({name: it.metaData.entityName}));
            const entityQueueData = _.map(_.intersectionBy(this.getFormattedMetadata(allTxEntityMetaData, 1), queuedItems, 'name'), (data) => ({
                name: data.name,
                syncWeight: data.syncWeight / 3
            }));
            //reduce some weights from ref data for media it will used two times during sync
            const refDataWithWeightsReduced = allReferenceDataMetaData.map((entityMetaData) => ({
                name: entityMetaData.entityName,
                syncWeight: (entityMetaData.syncWeight - 0.1) / 2
            }));
            const mediaEntities = ['Media', 'After_Media'].map((media) => ({
                name: media,
                syncWeight: (allReferenceDataMetaData.length * 0.1) / 2
            }));
            return _.concat(
                entityQueueData,
                _.differenceBy(txMetaData, entityQueueData, 'name'),
                mediaEntities,
                refDataWithWeightsReduced,
            );
        } else {
            //entities will be used once during sync
            const txMetaData = this.getFormattedMetadata(allTxEntityMetaData, 1);
            const queuedItems = allTxEntityMetaData
                .map(this.entityQueueService.getAllQueuedItems)
                .filter((entities) => !_.isEmpty(entities.entities)).map((it) => ({name: it.metaData.entityName}));
            //entities will be used twice during sync
            const entityQueueData = _.map(_.intersectionBy(txMetaData, queuedItems, 'name'), (data) => ({
                name: data.name,
                syncWeight: data.syncWeight / 2
            }));
            return _.concat(
                this.getFormattedMetadata(allReferenceDataMetaData, 1),
                entityQueueData,
                _.differenceBy(txMetaData, entityQueueData, 'name')
            );
        }
    }

    sync(allEntitiesMetaData, trackProgress, statusMessageCallBack = _.noop) {

        const progressBarStatus = new ProgressbarStatus(trackProgress, this.getProgressSteps(allEntitiesMetaData));
        const updateProgressSteps = (entityMetadata, entitySyncStatus) => progressBarStatus.updateProgressSteps(entityMetadata, entitySyncStatus);
        const onProgressPerEntity = (entityType, numOfPages) => progressBarStatus.onComplete(entityType, numOfPages);
        const onAfterMediaPush = (entityType, numOfPages) => progressBarStatus.onComplete(entityType, numOfPages);
        const firstDataServerSync = this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, _.noop, updateProgressSteps);

        const mediaUploadRequired = this.mediaQueueService.isMediaUploadRequired();

        this.dispatchAction(SyncTelemetryActions.START_SYNC);

        const syncCompleted = () => Promise.resolve(this.dispatchAction(SyncTelemetryActions.SYNC_COMPLETED))
            .then(() => this.telemetrySync(allEntitiesMetaData, onProgressPerEntity))
            .then(() => Promise.resolve(progressBarStatus.onSyncComplete()))
            .then(() => this.clearDataIn([RuleFailureTelemetry]));

        //Even blank dataServerSync with no data in or out takes quite a while.
        // Don't do it twice if no image sync required
        return mediaUploadRequired ?
            firstDataServerSync
                .then(() => this.imageSync(statusMessageCallBack).then(() => onAfterMediaPush('Media', 0)))
                .then(() => this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush, _.noop))
                .then(syncCompleted)
            : firstDataServerSync.then(syncCompleted);
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

    dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush, updateProgressSteps) {

        const allReferenceDataMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "reference");
        const allTxEntityMetaData = allEntitiesMetaData.filter((entityMetaData) => entityMetaData.type === "tx");

        return this.authenticate()
            .then((idToken) => this.conventionalRestClient.setToken(idToken))

            .then(() => statusMessageCallBack("uploadLocallySavedData"))
            .then(() => this.pushData(allTxEntityMetaData.slice(), onProgressPerEntity))
            .then(() => onAfterMediaPush("After_Media", 0))

            .then(() => statusMessageCallBack("downloadForms"))
            .then(() => this.getRefData(allReferenceDataMetaData, onProgressPerEntity))
            .then(() => this.updateAsPerNewPrivilege(allTxEntityMetaData, updateProgressSteps))

            .then(() => statusMessageCallBack("downloadNewDataFromServer"))
            .then(() => this.getTxData(allTxEntityMetaData, onProgressPerEntity))

    }

    updateAsPerNewPrivilege(entityMetadata, updateProgressSteps) {
        const entitySyncStatusService = this.getService(EntitySyncStatusService);
        entitySyncStatusService.updateEntitySyncStatusWithNewPrivileges(entityMetadata);
        updateProgressSteps(entityMetadata, entitySyncStatusService.findAll());
    }

    getRefData(entitiesMetadata, afterEachPagePulled) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => _.assignIn({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
            }, entityMetadata));
        return this.getData(entitiesMetaDataWithSyncStatus, afterEachPagePulled);
    }

    getTxData(entitiesMetadata, afterEachPagePulled) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => {
                const metadata = this.entitySyncStatusService.getAllByEntityName(entityMetadata.entityName);
                return _.reduce(metadata, (acc, m) => {
                    acc.push(_.assignIn({syncStatus: m}, entityMetadata));
                    return acc;
                }, [])
            }).flat(1);
        return this.getData(entitiesMetaDataWithSyncStatus, afterEachPagePulled);
    }

    getData(entitiesMetaDataWithSyncStatus, afterEachPagePulled) {
        const onGetOfFirstPage = (entityName, page) =>
            this.dispatchAction(SyncTelemetryActions.RECORD_FIRST_PAGE_OF_PULL, {
                entityName,
                totalElements: page.totalElements
            });

        return this.conventionalRestClient.getAll(entitiesMetaDataWithSyncStatus, this.persistAll, onGetOfFirstPage, afterEachPagePulled);
    }

    persistAll(entityMetaData, entityResources) {
        if (_.isEmpty(entityResources)) return;
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const entities = entityResources.reduce((acc, resource) => acc.concat([entityMetaData.entityClass.fromResource(resource, this.entityService, entityResources)]), []);
        let entitiesToCreateFns = this.createEntities(entityMetaData.entityName, entities);
        if (entityMetaData.nameTranslated) {
            entityResources.map((entity) => this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue));
        }
        //most avni-models are designed to have oneToMany relations
        //Each model has a static method `associateChild` implemented in manyToOne fashion
        //`<A Model>.associateChild()` method takes childInformation, finds the parent, assigns the child to the parent and returns the parent
        //`<A Model>.associateChild()` called many times as many children
        if (!_.isEmpty(entityMetaData.parent)) {
            const parentEntities = _.zip(entityResources, entities)
                .map(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChild(entity, entityMetaData.entityClass, entityResource, this.entityService));
            const mergedParentEntities =
                _.values(_.groupBy(parentEntities, 'uuid'))
                    .map(entityMetaData.parent.entityClass.merge(entityMetaData.entityClass));
            entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityMetaData.parent.entityName, mergedParentEntities));
        }

        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName, entityMetaData.syncStatus.entityTypeUuid);

        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.entityName = entityMetaData.entityName;
        entitySyncStatus.entityTypeUuid = entityMetaData.syncStatus.entityTypeUuid;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(_.last(entityResources)["lastModifiedDateTime"]);
        this.bulkSaveOrUpdate(entitiesToCreateFns.concat(this.createEntities(EntitySyncStatus.schema.name, [entitySyncStatus])));

        this.dispatchAction(SyncTelemetryActions.ENTITY_PULL_COMPLETED, {
            entityName: entityMetaData.entityName,
            numberOfPulledEntities: entities.length
        });
    }

    pushData(allTxEntityMetaData, afterEachEntityTypePushed) {
        const entitiesToPost = allTxEntityMetaData.reverse()
            .map(this.entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));

        this.dispatchAction(SyncTelemetryActions.RECORD_PUSH_TODO_TELEMETRY, {entitiesToPost});

        const onCompleteOfIndividualPost = (entityMetadata, entityUUID) => {
            return () => {
                this.dispatchAction(SyncTelemetryActions.ENTITY_PUSH_COMPLETED, {entityMetadata});
                return this.entityQueueService.popItem(entityUUID)();
            }
        };

        return this.conventionalRestClient.postAllEntities(entitiesToPost, onCompleteOfIndividualPost, afterEachEntityTypePushed);
    }

    clearData() {
        this.entityService.clearDataIn(EntityMetaData.entitiesLoadedFromServer());
        this.entitySyncStatusService.setup(EntityMetaData.model());
        this.ruleEvaluationService.init();
        this.messageService.init();
        this.ruleService.init();
    }
}

export default SyncService;
