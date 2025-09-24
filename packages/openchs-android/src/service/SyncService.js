import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";

import {
    EntityMetaData,
    EntitySyncStatus,
    RuleFailureTelemetry,
    SyncTelemetry,
    IgnorableSyncError
} from 'openchs-models';
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
import ConceptService from "./ConceptService";
import EncryptionService from "./EncryptionService";
import SubjectTypeService from "./SubjectTypeService";
import MetricsService from "./MetricsService";
import {post} from "../framework/http/requests";
import General from "../utility/General";
import SubjectMigrationService from "./SubjectMigrationService";
import ResetSyncService from "./ResetSyncService";
import TaskUnAssignmentService from "./task/TaskUnAssignmentService";
import UserSubjectAssignmentService from "./UserSubjectAssignmentService";
import moment from "moment";
import AllSyncableEntityMetaData from "../model/AllSyncableEntityMetaData";
import {IndividualSearchActionNames as IndividualSearchActions} from '../action/individual/IndividualSearchActions';
import {LandingViewActionsNames as LandingViewActions} from '../action/LandingViewActions';
import {MyDashboardActionNames} from '../action/mydashboard/MyDashboardActions';
import {
    CustomDashboardActionNames,
    performCustomDashboardActionAndClearRefresh,
} from '../action/customDashboard/CustomDashboardActions';
import LocalCacheService from "./LocalCacheService";
import CustomDashboardService, {CustomDashboardType} from './customDashboard/CustomDashboardService';
import DeviceInfo from "react-native-device-info";

function transformResourceToEntity(entityMetaData, entityResources) {
    return (acc, resource) => {
        try {
            return acc.concat([entityMetaData.entityClass.fromResource(resource, this.entityService, entityResources)]);
        } catch (error) {
            if (error instanceof IgnorableSyncError) {
                resource.excludeFromPersist = true;
                General.logError("SyncService", error);
            } else {
                throw error;
            }
        }
        return acc; // since error is IgnorableSyncError, return accumulator as is
    }
}

@Service("syncService")
class SyncService extends BaseService {
    static deviceId;
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
        this.conceptService = this.getService(ConceptService);
        this.newsService = this.getService(NewsService);
        this.extensionService = this.getService(ExtensionService);
        this.subjectTypeService = this.getService(SubjectTypeService);
        this.metricsService = this.getService(MetricsService);
    }

    async sync(allEntitiesMetaData, trackProgress, statusMessageCallBack = _.noop, connectionInfo, syncStartTime, syncSource = SyncService.syncSources.SYNC_BUTTON, userConfirmation) {
        // Mutex protection to prevent concurrent sync operations
        if (SyncService.syncMutex) {
            General.logInfo("SyncService", `Sync already in progress, skipping ${syncSource} sync`);
            
            // Simulate a quick completion to dismiss the progress modal properly
            if (trackProgress) {
                // Show brief message that sync is already running
                trackProgress({
                    message: 'Sync already in progress...',
                    progress: 0.5,
                    syncing: true
                });
                
                // Wait a moment then complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                trackProgress({
                    message: 'Sync already running in background',
                    progress: 1,
                    syncing: false
                });
            }
            
            return Promise.resolve(syncSource);
        }
        
        SyncService.syncMutex = true;
        General.logInfo("SyncService", `Starting ${syncSource} sync with mutex protection`);
        
        try {
            return await this._performSync(allEntitiesMetaData, trackProgress, statusMessageCallBack, connectionInfo, syncStartTime, syncSource, userConfirmation);
        } catch (error) {
            General.logError("SyncService", `Sync failed: ${error.message}`);
            throw error;
        } finally {
            SyncService.syncMutex = false;
            General.logInfo("SyncService", `Completed ${syncSource} sync, mutex released`);
        }
    }

    async _performSync(allEntitiesMetaData, trackProgress, statusMessageCallBack = _.noop, connectionInfo, syncStartTime, syncSource = SyncService.syncSources.SYNC_BUTTON, userConfirmation) {
        General.logDebug("SyncService", "sync");
        this.deviceId = await DeviceInfo.getAndroidId();
        const progressBarStatus = new ProgressbarStatus(trackProgress,
            AllSyncableEntityMetaData.getProgressSteps(this.mediaQueueService.isMediaUploadRequired(), allEntitiesMetaData, this.entityQueueService.getPresentEntities()));
        const updateProgressSteps = (entityMetadata, entitySyncStatus) => progressBarStatus.updateProgressSteps(entityMetadata, entitySyncStatus);
        const onProgressPerEntity = (entityType, totalNumberOfPages, currentPageNumber) => {
            progressBarStatus.onComplete(entityType, totalNumberOfPages, currentPageNumber);
        };
        const onAfterMediaPush = (entityType, numOfPages) => progressBarStatus.onComplete(entityType, numOfPages);

        const mediaUploadRequired = this.mediaQueueService.isMediaUploadRequired();
        const updatedSyncSource = this.getUpdatedSyncSource(syncSource);
        const appInfo = await this.metricsService.getAppInfo();
        this.dispatchAction(SyncTelemetryActions.START_SYNC, {connectionInfo, syncSource: updatedSyncSource, appInfo});
        const syncCompleted = () => Promise.resolve(this.dispatchAction(SyncTelemetryActions.SYNC_COMPLETED))
            .then(() => this.telemetrySync(allEntitiesMetaData, onProgressPerEntity))
            .then(() => Promise.resolve(progressBarStatus.onSyncComplete()))
            .then(() => Promise.resolve(this.logSyncCompleteEvent(syncStartTime)))
            .then(() => this.clearDataIn([RuleFailureTelemetry]))
            .then(() => this.downloadNewsImages())
            .then(() => {
                return updatedSyncSource;
            });

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
        return promise.then(() => this.dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush, updateProgressSteps, isManualSync, userConfirmation, isOnlyUploadRequired)).then(syncCompleted);
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
        let lastSynced = this.getService("syncTelemetryService").getLatestCompletedFullSync();
        return !_.isEmpty(lastSynced) && moment(lastSynced.syncEndTime).add(12, 'hours').isBefore(moment());
    }

    logSyncCompleteEvent(syncStartTime) {
        const syncTime = Date.now() - syncStartTime;
        logEvent(firebaseEvents.SYNC_COMPLETE, {time_taken: syncTime});
    }

    mediaSync(statusMessageCallBack) {
        return Promise.resolve(statusMessageCallBack("uploadMedia"))
            .then(() => this.mediaQueueService.uploadMedia(statusMessageCallBack));
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
        const requestParams = `includeUserSubjectType=true&deviceId=${this.deviceId}`;
        const entitySyncStatuses = this.entitySyncStatusService.findAll().map(_.identity);
        return post(`${url}/v2/syncDetails?${requestParams}`, entitySyncStatuses, true)
            .then(res => res.json())
            .then(({syncDetails, nowMinus10Seconds, now}) => ({
                syncDetails,
                now,
                endDateTime: nowMinus10Seconds
            }));
    }

    retainEntitiesPresentInCurrentVersion(syncDetails, allEntitiesMetaData) {
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
            else
                return Promise.reject(new IgnorableSyncError("userDeclinedResetSync", "User Declined Reset Sync"));
        }
    }

    /*
     * If isOnlyUploadRequired = true, then only perform upload of data to Backend server
     */
    async dataServerSync(allEntitiesMetaData, statusMessageCallBack, onProgressPerEntity, onAfterMediaPush, updateProgressSteps, isSyncResetRequired, userConfirmation, isOnlyUploadRequired) {
        const allTxEntityMetaData = this.getMetadataByType(allEntitiesMetaData, "tx");
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
        const referenceEntityMetadata = this.getMetadataByType(filteredMetadata, "reference");
        const filteredTxData = this.getMetadataByType(filteredMetadata, "tx");
        const userInfoData = _.filter(filteredMetadata, ({entityName}) => entityName === "UserInfo");
        const subjectMigrationMetadata = _.filter(allEntitiesMetaData, ({entityName}) => entityName === "SubjectMigration");
        const currentVersionEntitySyncDetails = this.retainEntitiesPresentInCurrentVersion(syncDetails, allEntitiesMetaData);
        General.logDebug("SyncService", `Entities to sync ${_.map(currentVersionEntitySyncDetails, ({entityName, entityTypeUuid}) => [entityName, entityTypeUuid])}`);
        this.entitySyncStatusService.updateAsPerSyncDetails(currentVersionEntitySyncDetails);

        let syncDetailsWithPrivileges;
        return Promise.resolve(statusMessageCallBack("downloadForms"))
            .then(() => this.getTxData(userInfoData, onProgressPerEntity, syncDetails, endDateTime))
            .then(() => this.getRefData(referenceEntityMetadata, onProgressPerEntity, now, endDateTime))
            .then(() => this.getService(EncryptionService).encryptOrDecryptDbIfRequired())
            .then(() => syncDetailsWithPrivileges = this.updateAsPerNewPrivilege(allEntitiesMetaData, updateProgressSteps, currentVersionEntitySyncDetails))
            .then(() => statusMessageCallBack("downloadNewDataFromServer"))
            .then(() => this.getTxData(subjectMigrationMetadata, onProgressPerEntity, syncDetailsWithPrivileges, endDateTime))
            .then(() => this.getService(SubjectMigrationService).migrateSubjects(onProgressPerEntity))
            .then(() => this.getTxData(filteredTxData, onProgressPerEntity, syncDetailsWithPrivileges, endDateTime))
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

    downloadSubjectTypeIcons() {
        General.logDebug("SyncService", "Starting to download subject type icons");
        const subjectTypesWithIcons = this.subjectTypeService.getAllSubjectTypesWithIcon();
        General.logDebug("SyncService", `Found ${subjectTypesWithIcons.length} subject types with icons`);
        return Promise.all(_.map(subjectTypesWithIcons, ({iconFileS3Key}) => this.mediaService.downloadFileIfRequired(iconFileS3Key, 'Icons')));
    }

    downloadConceptIcons() {
        General.logDebug("SyncService", "Starting to download concept icons");
        const conceptsWithIcons = this.conceptService.getAllConceptsWithIcon();
        General.logDebug("SyncService", `Found ${conceptsWithIcons.length} concepts with icons`);
        return Promise.all(_.map(conceptsWithIcons, ({mediaUrl}) => this.mediaService.downloadFileIfRequired(mediaUrl, 'Metadata', false)));
    }

    downloadIcons() {
        General.logDebug("SyncService", "Starting downloadIcons method");
        
        return Promise.all([
            this.downloadSubjectTypeIcons(),
            this.downloadConceptIcons()
        ]).then(results => {
            const [subjectTypeIconResults, conceptIconResults] = results;
            General.logDebug("SyncService", `Downloaded ${subjectTypeIconResults.length} subject type icons and ${conceptIconResults.length} concept icons`);
            return [...subjectTypeIconResults, ...conceptIconResults];
        }).catch(error => {
            General.logError("SyncService", "Error in downloadIcons:", error);
            throw error;
        });
    }
    updateAsPerNewPrivilege(allEntitiesMetaData, updateProgressSteps, syncDetails) {
        let syncDetailsWithPrivileges = this.entitySyncStatusService.removeRevokedPrivileges(allEntitiesMetaData, syncDetails);
        updateProgressSteps(allEntitiesMetaData, syncDetails);
        return syncDetailsWithPrivileges;
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

        return this.conventionalRestClient.getAll(entitiesMetaDataWithSyncStatus, this.persistAll, onGetOfFirstPage, afterEachPagePulled, now, this.deviceId);
    }

    associateParent(entityResources, entities, entityMetaData) {
        const parentEntities = _.zip(entityResources, entities)
            .map(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChild(entity, entityMetaData.entityClass, entityResource, this.entityService));
        return _.values(_.groupBy(parentEntities, 'uuid'))
            .map((parentEntitiesWithSameUuid) => entityMetaData.parent.entityClass.merge(entityMetaData.entityClass.schema.name)(parentEntitiesWithSameUuid));
    }

    associateMultipleParents(entityResources, entities, entityMetaData) {
        const parentEntities = _.zip(entityResources, entities)
            .flatMap(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChildToMultipleParents(entity, entityMetaData.entityClass, entityResource, this.entityService));
        return _.values(_.groupBy(parentEntities, 'uuid')).map(entities => entityMetaData.parent.entityClass.mergeMultipleParents(entityMetaData.entityClass.schema.name, entities));
    }

    persistAll(entityMetaData, entityResources) {
        if (_.isEmpty(entityResources)) return;
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const loadedSince = _.last(entityResources).lastModifiedDateTime;

        const entities = entityResources.reduce(transformResourceToEntity.call(this, entityMetaData, entityResources), []);
        const initialLength = entityResources.length;
        //Filtering out the entityResources which were not converted into entities due to IgnorableSyncErrors
        entityResources = _.filter(entityResources, (resource) => !resource.excludeFromPersist);
        General.logDebug("SyncService", `Before filter entityResources length: ${initialLength}, after filter entityResources length: ${entityResources.length}, entities length  ${entities.length}`);
        General.logDebug("SyncService", `Creating entity create functions for schema ${entityMetaData.schemaName}`);
        let entitiesToCreateFns = this.getCreateEntityFunctions(entityMetaData.schemaName, entities);
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
                General.logDebug("SyncService", `MultipleAssociations: Creating entity create functions for parent schema ${entityMetaData.parent.entityName}`);
                entitiesToCreateFns = entitiesToCreateFns.concat(this.getCreateEntityFunctions(entityMetaData.parent.entityName, mergedParentEntities));
            } else {
                const mergedParentEntities = this.associateParent(entityResources, entities, entityMetaData);
                General.logDebug("SyncService", `SingleAssociation: Creating entity create functions for parent schema ${entityMetaData.parent.entityName}`);
                entitiesToCreateFns = entitiesToCreateFns.concat(this.getCreateEntityFunctions(entityMetaData.parent.entityName, mergedParentEntities));
            }
        }

        if (entityMetaData.entityName === "TaskUnAssignment") {
            this.getService(TaskUnAssignmentService).deleteUnassignedTasks(entities);
        }

        if (entityMetaData.entityName === 'UserSubjectAssignment') {
            this.getService(UserSubjectAssignmentService).deleteUnassignedSubjectsAndDependents(entities);
        }

        General.logDebug("SyncService", `Syncing - ${entityMetaData.entityName} with subType: ${entityMetaData.syncStatus.entityTypeUuid}`);
        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName, entityMetaData.syncStatus.entityTypeUuid);
        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.entityName = entityMetaData.entityName;
        entitySyncStatus.entityTypeUuid = entityMetaData.syncStatus.entityTypeUuid;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(loadedSince);
        General.logDebug("SyncService", `Creating entity create functions for ${currentEntitySyncStatus}`);
        this.bulkSaveOrUpdate(entitiesToCreateFns.concat(this.getCreateEntityFunctions(EntitySyncStatus.schema.name, [entitySyncStatus])));
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

    resetServicesAfterFullSyncCompletion(updatedSyncSource) {
        if (updatedSyncSource !== SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB) {
            General.logInfo("Sync", "Full Sync completed, performing reset")
            this.reset(false);
            this.getService(SettingsService).initLanguages();
            General.logInfo("Sync", 'Full Sync completed, reset completed');
        }
    }

    reset(syncRequired: false) {
        this.context.getService(RuleEvaluationService).init();
        this.context.getService(MessageService).init();
        this.context.getService(RuleService).init();
        this.dispatchAction('RESET');
        this.context.getService(PrivilegeService).deleteRevokedEntities(); //Invoking this in MenuView.deleteData as well

        this.dispatchAction(IndividualSearchActions.ON_LOAD);
        LocalCacheService.getPreviouslySelectedSubjectTypeUuid().then(cachedSubjectTypeUUID => {
            this.dispatchAction(LandingViewActions.ON_LOAD, {syncRequired, cachedSubjectTypeUUID});
        });
        const customDashboardService = this.context.getService(CustomDashboardService);
        const renderCustomDashboard = customDashboardService.isCustomDashboardMarkedPrimary();
        if (renderCustomDashboard) {
            performCustomDashboardActionAndClearRefresh(this, CustomDashboardActionNames.ON_LOAD, {customDashboardType: CustomDashboardType.None});
        } else {
            this.dispatchAction(MyDashboardActionNames.ON_LOAD);
        }
    }
}

export default SyncService;
