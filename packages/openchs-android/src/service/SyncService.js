import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";
import {EntityApprovalStatus, EntityMetaData, EntitySyncStatus, RuleFailureTelemetry, SyncTelemetry} from 'avni-models';
import EntityQueueService from "./EntityQueueService";
import MessageService from "./MessageService";
import RuleEvaluationService from "./RuleEvaluationService";
import MediaQueueService from "./MediaQueueService";
import ProgressbarStatus from "./ProgressbarStatus";
import {SyncTelemetryActionNames as SyncTelemetryActions} from "../action/SyncTelemetryActions";
import _ from "lodash";
import RuleService from "./RuleService";
import PrivilegeService from "./PrivilegeService";
import {firebaseEvents, logEvent} from "../utility/Analytics";
import MediaService from "./MediaService";
import NewsService from "./news/NewsService";
import ExtensionService from "./ExtensionService";
import SubjectTypeService from "./SubjectTypeService";
import {post} from "../framework/http/requests";
import General from "../utility/General";
import SubjectMigrationService from "./SubjectMigrationService";
import ResetSyncService from "./ResetSyncService";
import TaskUnAssignmentService from "./task/TaskUnAssignmentService";
import UserSubjectAssignmentService from "./UserSubjectAssignmentService";
import moment from "moment";
import AllSyncableEntityMetaData from "../model/AllSyncableEntityMetaData";

@Service("syncService")
class SyncService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.persistAll = this.persistAll.bind(this);
    }

    static syncSources = {
        ONLY_UPLOAD_BACKGROUND_JOB: 'automatic-upload-only',
        BACKGROUND_JOB: 'automatic',
        SYNC_BUTTON: 'manual'
    };

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.entityService = this.getService(EntityService);
        this.conventionalRestClient = new ConventionalRestClient(this.getService(SettingsService), this.getService(PrivilegeService));
        this.messageService = this.getService(MessageService);
        this.ruleEvaluationService = this.getService(RuleEvaluationService);
        this.mediaQueueService = this.getService(MediaQueueService);
        this.entityQueueService = this.getService(EntityQueueService);
        this.ruleService = this.getService(RuleService);
        this.mediaService = this.getService(MediaService);
        this.newsService = this.getService(NewsService);
        this.extensionService = this.getService(ExtensionService);
        this.subjectTypeService = this.getService(SubjectTypeService);
    }

    async sync(allEntitiesMetaData, trackProgress, statusMessageCallBack = _.noop, connectionInfo, syncStartTime, syncSource = SyncService.syncSources.SYNC_BUTTON, userConfirmation) {
        General.logDebug("SyncService", "sync");
        const progressBarStatus = new ProgressbarStatus(trackProgress,
                    AllSyncableEntityMetaData.getProgressSteps(this.mediaQueueService.isMediaUploadRequired(), allEntitiesMetaData, this.entityQueueService.getPresentEntities()));
        const updateProgressSteps = (entityMetadata, entitySyncStatus) => progressBarStatus.updateProgressSteps(entityMetadata, entitySyncStatus);
        const onProgressPerEntity = (entityType, numOfPages) => {
            progressBarStatus.onComplete(entityType, numOfPages);
        };
        const onAfterMediaPush = (entityType, numOfPages) => progressBarStatus.onComplete(entityType, numOfPages);

        const mediaUploadRequired = this.mediaQueueService.isMediaUploadRequired();
        const updatedSyncSource = this.getUpdatedSyncSource(syncSource);
        this.dispatchAction(SyncTelemetryActions.START_SYNC, {connectionInfo, syncSource: updatedSyncSource});
        const syncCompleted = () => Promise.resolve(this.dispatchAction(SyncTelemetryActions.SYNC_COMPLETED))
            .then(() => this.telemetrySync(allEntitiesMetaData, onProgressPerEntity))
            .then(() => Promise.resolve(progressBarStatus.onSyncComplete()))
            .then(() => Promise.resolve(this.logSyncCompleteEvent(syncStartTime)))
            .then(() => this.clearDataIn([RuleFailureTelemetry]))
            .then(() => this.downloadNewsImages());

        // Even blank dataServerSync with no data in or out takes quite a while.
        // Don't do it twice if no image sync required
        General.logDebug('mediaUploadRequired', mediaUploadRequired);
        const isManualSync = updatedSyncSource === SyncService.syncSources.SYNC_BUTTON;
        const isOnlyUploadRequired = updatedSyncSource === SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB;
        let promise;
        if (mediaUploadRequired) {
            promise = this.mediaSync(statusMessageCallBack).then(() => onAfterMediaPush('Media', 0));
        } else {
            promise = Promise.resolve();
        }
        promise.then(() => this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush, updateProgressSteps, isManualSync, userConfirmation, isOnlyUploadRequired)).then(syncCompleted);
    }

    /*
     * Return SyncService.syncSources.BACKGROUND_JOB in place of SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB,
     * if the last Completed Full Sync happened more than twelve hours ago
     */
    getUpdatedSyncSource(syncSource) {
        return (syncSource === SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB
            && this.wasLastCompletedFullSyncDoneMoreThan12HoursAgo())
            ? SyncService.syncSources.BACKGROUND_JOB : syncSource;
    }

    wasLastCompletedFullSyncDoneMoreThan12HoursAgo() {
        let lastSynced = this.getService("syncTelemetryService").getAllCompletedFullSyncsSortedByDescSyncEndTime();
        return !_.isEmpty(lastSynced) && moment(lastSynced[0].syncEndTime).add(12, 'hours').isBefore(moment());
    }

    logSyncCompleteEvent(syncStartTime) {
        const syncTime = Date.now() - syncStartTime;
        logEvent(firebaseEvents.SYNC_COMPLETE, {time_taken: syncTime});
    }

    mediaSync(statusMessageCallBack) {
        return Promise.resolve(statusMessageCallBack("uploadMedia"))
            .then(() => this.mediaQueueService.uploadMedia());
    }

    telemetrySync(allEntitiesMetaData, onProgressPerEntity) {
        const telemetryMetadata = allEntitiesMetaData.filter(entityMetadata => entityMetadata.schemaName === SyncTelemetry.schema.name);
        const onCompleteOfIndividualPost = (entityMetadata, entityUUID) => this.entityQueueService.popItem(entityUUID)();
        const entitiesToPost = telemetryMetadata.reverse()
            .map(this.entityQueueService.getAllQueuedItems)
            .filter((entities) => !_.isEmpty(entities.entities));
        return this.conventionalRestClient.postAllEntities(entitiesToPost, onCompleteOfIndividualPost, onProgressPerEntity);
    }

    getMetadataByType(entityMetadata, type) {
        return entityMetadata.filter((entityMetaData) => entityMetaData.type === type);
    }

    async getSyncDetails() {
        const url = this.getService(SettingsService).getSettings().serverURL;
        const entitySyncStatus = this.entitySyncStatusService.findAll().map(_.identity);
        return post(`${url}/v2/syncDetails`, entitySyncStatus, true)
            .then(res => res.json())
            .then(({syncDetails, nowMinus10Seconds, now}) => ({
                syncDetails,
                now,
                endDateTime: nowMinus10Seconds
            }));
    }

    updateSyncDetailsBasedOnEntityMetadata(syncDetails, allEntitiesMetaData) {
        const entityMetadataEntityNames = _.map(allEntitiesMetaData, 'entityName');
        return _.filter(syncDetails, (syncDetail) =>
            entityMetadataEntityNames.includes(syncDetail.entityName)
        )
    }

    async confirmUserAndResetSync(userConfirmation) {
        if (userConfirmation) {
            const userResponse = await userConfirmation();
            if (userResponse === 'YES')
                return this.getService(ResetSyncService).resetSync();
        }
    }

    /*
     * If isOnlyUploadRequired = true, then only perform upload of data to Backend server
     */
    async dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush, updateProgressSteps, isSyncResetRequired, userConfirmation, isOnlyUploadRequired) {
        const allTxEntityMetaData = _.union(this.getMetadataByType(allEntitiesMetaData, "parentOfVirtualTx"), this.getMetadataByType(allEntitiesMetaData, "tx"));
        const resetSyncMetadata = _.filter(allEntitiesMetaData, ({entityName}) => entityName === "ResetSync");
        const uploadData = Promise.resolve(statusMessageCallBack("uploadLocallySavedData"))
            .then(() => this.pushData(allTxEntityMetaData.slice(), onProgressPerEntity))
            .then(() => onAfterMediaPush("After_Media", 0));
        if (isOnlyUploadRequired) {
            return uploadData;
        }
        await uploadData
            .then(() => statusMessageCallBack("FetchingChangedResource"))
            .then(() => this.getResetSyncData(resetSyncMetadata, onProgressPerEntity))
            .then(async () => {
                const isResetSyncRequired = this.getService(ResetSyncService).isResetSyncRequired();
                return await isResetSyncRequired && isSyncResetRequired && this.confirmUserAndResetSync(userConfirmation);
            });

        const {syncDetails, endDateTime, now} = await this.getSyncDetails();

        const entitiesWithoutSubjectMigrationAndResetSync = _.filter(allEntitiesMetaData, ({entityName}) => !_.includes(['ResetSync', 'SubjectMigration'], entityName));
        const filteredMetadata = _.filter(entitiesWithoutSubjectMigrationAndResetSync, ({entityName}) => _.find(syncDetails, sd => sd.entityName === entityName));
        const filteredRefData = this.getMetadataByType(filteredMetadata, "reference");
        const filteredTxData = _.union(this.getMetadataByType(filteredMetadata, "virtualTx"), this.getMetadataByType(filteredMetadata, "tx"));
        const subjectMigrationMetadata = _.filter(allEntitiesMetaData, ({entityName}) => entityName === "SubjectMigration");
        const updatedSyncDetails = this.updateSyncDetailsBasedOnEntityMetadata(syncDetails, allEntitiesMetaData);
        General.logDebug("SyncService", `Entities to sync ${_.map(updatedSyncDetails, ({entityName, entityTypeUuid}) => [entityName, entityTypeUuid])}`);
        this.entitySyncStatusService.updateAsPerSyncDetails(updatedSyncDetails);

        return Promise.resolve(statusMessageCallBack("downloadForms"))
            .then(() => this.getRefData(filteredRefData, onProgressPerEntity, now))
            .then(() => this.updateAsPerNewPrivilege(allEntitiesMetaData, updateProgressSteps, updatedSyncDetails))
            .then(() => statusMessageCallBack("downloadNewDataFromServer"))
            .then(() => this.getTxData(subjectMigrationMetadata, onProgressPerEntity, updatedSyncDetails, endDateTime))
            .then(() => this.getService(SubjectMigrationService).migrateSubjects())
            .then(() => this.getTxData(filteredTxData, onProgressPerEntity, updatedSyncDetails, endDateTime))
            .then(() => this.downloadNewsImages())
            .then(() => this.downloadExtensions())
            .then(() => this.downloadIcons())
    }

    downloadExtensions() {
        this.extensionService.downloadExtensions();
    }

    downloadNewsImages() {
        const newsWithImages = this.newsService.getAllNewsWithHeroImage();
        return Promise.all(_.map(newsWithImages, ({heroImage}) => this.mediaService.downloadFileIfRequired(heroImage, 'News')))
    }

    downloadIcons() {
        const subjectTypesWithIcons = this.subjectTypeService.getAllSubjectTypesWithIcon();
        return Promise.all(_.map(subjectTypesWithIcons, ({iconFileS3Key}) => this.mediaService.downloadFileIfRequired(iconFileS3Key, 'Icons')))
    }

    updateAsPerNewPrivilege(allEntitiesMetaData, updateProgressSteps, syncDetails) {
        this.entitySyncStatusService.removeRevokedPrivileges(allEntitiesMetaData);
        updateProgressSteps(allEntitiesMetaData, syncDetails);
    }

    getRefData(entitiesMetadata, afterEachPagePulled, now) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => _.assignIn({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
            }, entityMetadata));
        return this.getData(entitiesMetaDataWithSyncStatus, afterEachPagePulled, now);
    }

    getResetSyncData(entitiesMetadata, afterEachPagePulled) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .map((entityMetadata) => _.assignIn({
                syncStatus: this.entitySyncStatusService.get(entityMetadata.entityName),
            }, entityMetadata));
        return this.getData(entitiesMetaDataWithSyncStatus, afterEachPagePulled, new Date().toISOString());
    }

    getTxData(entitiesMetadata, afterEachPagePulled, syncDetails, now) {
        const entitiesMetaDataWithSyncStatus = entitiesMetadata
            .reverse()
            .map((entityMetadata) => {
                const entitiesToSync = _.filter(syncDetails, ({entityName}) => entityMetadata.entityName === entityName);
                return _.reduce(entitiesToSync, (acc, m) => {
                    acc.push(_.assignIn({syncStatus: m}, entityMetadata));
                    return acc;
                }, [])
            }).flat(1);
        return this.getData(entitiesMetaDataWithSyncStatus, afterEachPagePulled, now);
    }

    getData(entitiesMetaDataWithSyncStatus, afterEachPagePulled, now) {
        const onGetOfFirstPage = (entityName, page) =>
            this.dispatchAction(SyncTelemetryActions.RECORD_FIRST_PAGE_OF_PULL, {
                entityName,
                totalElements: page.totalElements
            });

        return this.conventionalRestClient.getAll(entitiesMetaDataWithSyncStatus, this.persistAll, onGetOfFirstPage, afterEachPagePulled, now);
    }

    associateParent(entityResources, entities, entityMetaData) {
        const parentEntities = _.zip(entityResources, entities)
            .map(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChild(entity, entityMetaData.entityClass, entityResource, this.entityService));
        return _.values(_.groupBy(parentEntities, 'uuid')).map(entityMetaData.parent.entityClass.merge(entityMetaData.entityClass));
    }

    associateMultipleParents(entityResources, entities, entityMetaData) {
        const parentEntities = _.zip(entityResources, entities)
            .flatMap(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChildToMultipleParents(entity, entityMetaData.entityClass, entityResource, this.entityService));
        return _.values(_.groupBy(parentEntities, 'uuid')).map(entities => entityMetaData.parent.entityClass.mergeMultipleParents(entityMetaData.entityClass, entities));
    }

    persistAll(entityMetaData, entityResources) {
        if (_.isEmpty(entityResources)) return;
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const entities = entityResources.reduce((acc, resource) => acc.concat([entityMetaData.entityClass.fromResource(resource, this.entityService, entityResources)]), []);
        let entitiesToCreateFns = this.createEntities(entityMetaData.schemaName, entities);
        if (entityMetaData.nameTranslated) {
            entityResources.map((entity) => this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue));
        }
        //most avni-models are designed to have oneToMany relations
        //Each model has a static method `associateChild` implemented in manyToOne fashion
        //`<A Model>.associateChild()` method takes childInformation, finds the parent, assigns the child to the parent and returns the parent
        //`<A Model>.associateChild()` called many times as many children
        if (!_.isEmpty(entityMetaData.parent)) {
            if (entityMetaData.hasMoreThanOneAssociation) {
                const mergedParentEntities = this.associateMultipleParents(entityResources, entities, entityMetaData);
                entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityMetaData.parent.entityName, mergedParentEntities));
            } else {
                const mergedParentEntities = this.associateParent(entityResources, entities, entityMetaData);
                entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityMetaData.parent.entityName, mergedParentEntities));
            }
        }

        if (entityMetaData.entityName === "TaskUnAssignment") {
            this.getService(TaskUnAssignmentService).deleteUnassignedTasks(entities);
        }

        if (entityMetaData.schemaName === 'EntityApprovalStatus') {
            const latestApprovalStatuses = EntityApprovalStatus.getLatestApprovalStatusByEntity(entities, this.entityService);
            _.forEach(latestApprovalStatuses, ({schema, entity}) => {
                entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(schema, [entity]));
            });
        }

        if (entityMetaData.entityName === 'UserSubjectAssignment') {
            this.getService(UserSubjectAssignmentService).deleteUnassignedSubjectsAndDependents(entities);
        }

        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName, entityMetaData.syncStatus.entityTypeUuid);
        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.entityName = entityMetaData.entityName;
        entitySyncStatus.entityTypeUuid = entityMetaData.syncStatus.entityTypeUuid;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(_.last(entityResources).lastModifiedDateTime);
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
        this.entitySyncStatusService.setup();
        this.ruleEvaluationService.init();
        this.messageService.init();
        this.ruleService.init();
    }
}

export default SyncService;
