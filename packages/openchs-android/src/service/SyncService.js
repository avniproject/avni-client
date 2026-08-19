import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";

import {
    EntityMetaData,
    EntitySyncStatus,
    MyGroups,
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
import DownloadableContentService from "./DownloadableContentService";
import CustomCardConfigService from "./CustomCardConfigService";
import FormShareTemplateService from "./FormShareTemplateService";
import ConceptService from "./ConceptService";
import EncryptionService from "./EncryptionService";
import SubjectTypeService from "./SubjectTypeService";
import MetricsService from "./MetricsService";
import {post} from "../framework/http/requests";
import General from "../utility/General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import SubjectMigrationService from "./SubjectMigrationService";
import AddressLevelService from "./AddressLevelService";
import ResetSyncService from "./ResetSyncService";
import TaskUnAssignmentService from "./task/TaskUnAssignmentService";
import UserSubjectAssignmentService from "./UserSubjectAssignmentService";
import moment from "moment";
import AllSyncableEntityMetaData from "../model/AllSyncableEntityMetaData";
import {IndividualSearchActionNames as IndividualSearchActions} from '../action/individual/IndividualSearchActions';
import {LandingViewActionsNames as LandingViewActions} from '../action/LandingViewActions';
import LocalCacheService from "./LocalCacheService";
import DeviceInfo from "react-native-device-info";
import {pruneConceptMedia} from "../task/PruneMedia";
import FileSystem from "../model/FileSystem";
import {jsonArrayListPropFor} from "../framework/db/SchemaGenerator";

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
        this.downloadableContentService = this.getService(DownloadableContentService);
        this.customCardConfigService = this.getService(CustomCardConfigService);
        this.formShareTemplateService = this.getService(FormShareTemplateService);
        this.subjectTypeService = this.getService(SubjectTypeService);
        this.metricsService = this.getService(MetricsService);
        this.syncLock = undefined;
    }

    acquireLock() {
        if (!this.syncLock) {
            this.syncLock = General.randomUUID();
            return this.syncLock;
        }
        return undefined;
    }

    releaseLock(lockId) {
        if (this.syncLock === lockId) {
            this.syncLock = undefined;
        }
    }


    async sync(lockId, allEntitiesMetaData, trackProgress, statusMessageCallBack = _.noop, connectionInfo, syncStartTime, syncSource = SyncService.syncSources.SYNC_BUTTON, userConfirmation) {
        //Run only a single instance of the sync process. Status of sync is available in Redux
        if (this.syncLock !== lockId) {
            return Promise.reject("Use acquireLock before calling this function");
        }

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
            .then(() => pruneConceptMedia(this.db, FileSystem.getMetadataDir()))
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

        let {syncDetails, endDateTime, now} = await this.getSyncDetails();
        // Server clock read immediately after pushData, so everything this sync uploaded
        // is stamped at or before it. The migration catch-up pull needs it to know when
        // its window has moved past our own uploads.
        const serverTimeAfterUpload = now;

        const entitiesWithoutSubjectMigrationAndResetSync = _.filter(allEntitiesMetaData, ({entityName}) => !_.includes(['ResetSync', 'SubjectMigration'], entityName));
        const filteredMetadata = _.filter(entitiesWithoutSubjectMigrationAndResetSync, ({entityName}) => _.find(syncDetails, sd => sd.entityName === entityName));
        const referenceEntityMetadata = this.getMetadataByType(filteredMetadata, "reference");
        // Only MyGroups has to be fresh before the migration check — it is what decides
        // whether to switch. The rest is deferred: on a migration sync the switch abandons
        // this backend and re-pulls every reference entity into SQLite, so pulling the bulk
        // here would fetch the whole reference dataset twice.
        const migrationDecisionMetadata = _.filter(referenceEntityMetadata,
            ({entityName}) => entityName === MyGroups.schema.name);
        const deferredReferenceMetadata = _.filter(referenceEntityMetadata,
            ({entityName}) => entityName !== MyGroups.schema.name);
        // let (not const): after a mid-sync backend switch these are recomputed from the
        // post-switch syncDetails so the transactional pull uses the fresh REALLY_OLD_DATE
        // checkpoints on the new backend rather than the pre-switch (Realm) ones.
        let filteredTxData = this.getMetadataByType(filteredMetadata, "tx");
        const userInfoData = _.filter(filteredMetadata, ({entityName}) => entityName === "UserInfo");
        const subjectMigrationMetadata = _.filter(allEntitiesMetaData, ({entityName}) => entityName === "SubjectMigration");
        let currentVersionEntitySyncDetails = this.retainEntitiesPresentInCurrentVersion(syncDetails, allEntitiesMetaData);
        General.logDebug("SyncService", `Entities to sync ${_.map(currentVersionEntitySyncDetails, ({entityName, entityTypeUuid}) => [entityName, entityTypeUuid])}`);
        this.entitySyncStatusService.updateAsPerSyncDetails(currentVersionEntitySyncDetails);

        let syncDetailsWithPrivileges;
        // Tracks whether a mid-sync backend switch happened in this sync, and whether
        // the download pipeline finished successfully. Both are read in the final .then
        // (to flip migration state to IDLE) and the .finally (to gate the FK integrity
        // check on a successful sync — a half-populated DB after a network drop would
        // otherwise produce spurious FK violation reports).
        let migrationSwitched = false;
        let syncSucceeded = false;
        this._disableForeignKeysIfSqlite();
        this._enableShallowHydrationIfSqlite();
        return Promise.resolve(statusMessageCallBack("downloadForms"))
            .then(() => this.getTxData(userInfoData, onProgressPerEntity, syncDetails, endDateTime))
            .then(() => this.getRefData(migrationDecisionMetadata, onProgressPerEntity, now, endDateTime))
            .then(async () => {
                const result = await this._switchBackendAndResyncRefDataIfNeeded(
                    statusMessageCallBack, onProgressPerEntity, allEntitiesMetaData);
                if (result) {
                    syncDetails = result.syncDetails;
                    endDateTime = result.endDateTime;
                    migrationSwitched = true;
                    // Rebuild the transactional entity list + sync details from the POST-switch
                    // syncDetails. _switchBackendAndResyncRefDataIfNeeded re-seeded the new backend's
                    // entity_sync_status to REALLY_OLD_DATE, so these carry "never synced" checkpoints;
                    // the pre-switch values were computed against the already-synced Realm backend and
                    // would make the tx pull fetch only rows changed since the Realm sync — leaving the
                    // new SQLite DB near-empty.
                    const postSwitchFilteredMetadata = _.filter(entitiesWithoutSubjectMigrationAndResetSync,
                        ({entityName}) => _.find(syncDetails, sd => sd.entityName === entityName));
                    filteredTxData = this.getMetadataByType(postSwitchFilteredMetadata, "tx");
                    currentVersionEntitySyncDetails = this.retainEntitiesPresentInCurrentVersion(syncDetails, allEntitiesMetaData);
                }
            })
            // _switchBackendAndResyncRefDataIfNeeded already re-pulled all reference data on
            // the new backend, so only the no-switch path still owes the deferred bulk.
            .then(() => migrationSwitched
                ? undefined
                : this.getRefData(deferredReferenceMetadata, onProgressPerEntity, now, endDateTime))
            .then(() => this.getService(EncryptionService).encryptOrDecryptDbIfRequired())
            .then(() => {
                // Encryption/decryption reinitializes the DB; the fresh proxy comes up
                // with FK ON and shallow hydration off — re-apply sync modes for the
                // tx-data downloads still ahead.
                this._disableForeignKeysIfSqlite();
                this._enableShallowHydrationIfSqlite();
            })
            .then(() => this._buildReferenceCacheIfSqlite())
            .then(() => syncDetailsWithPrivileges = this.updateAsPerNewPrivilege(allEntitiesMetaData, updateProgressSteps, currentVersionEntitySyncDetails))
            .then(() => statusMessageCallBack("downloadNewDataFromServer"))
            .then(() => this.getTxData(subjectMigrationMetadata, onProgressPerEntity, syncDetailsWithPrivileges, endDateTime))
            .then(async () => {
                // Subject migration walks subject.enrolments → enrolment.encounters →
                // observation arrays etc. to delete an entire subject subtree, so it
                // needs deep hydration. Disable shallow mode just for this step.
                this._disableShallowHydrationIfSqlite();
                try {
                    return await this.getService(SubjectMigrationService).migrateSubjects(onProgressPerEntity);
                } finally {
                    this._enableShallowHydrationIfSqlite();
                }
            })
            .then(() => this.getTxData(filteredTxData, onProgressPerEntity, syncDetailsWithPrivileges, endDateTime))
            .then(() => migrationSwitched && this._catchUpTxDataAfterMigration(allEntitiesMetaData, serverTimeAfterUpload))
            .then(() => this.downloadNewsImages())
            .then(() => this.downloadExtensions())
            .then(() => this.downloadCustomCardHtmlFiles())
            .then(() => this.downloadFormShareTemplates())
            .then(() => this.downloadIcons())
            .then(() => this.downloadContent(statusMessageCallBack))
            .then(async () => {
                syncSucceeded = true;
                // Only now is it safe to record the migration as complete. If we persisted
                // phase=idle earlier (e.g. immediately after the switchBackend call), a crash
                // between then and here would leave AsyncStorage saying the migration finished
                // while the SQLite DB is only partially populated — and resumeIfPending would
                // not re-enter because phase is IDLE.
                if (migrationSwitched) {
                    await this._finalizeMigrationState();
                }
            })
            .finally(() => {
                this._disableShallowHydrationIfSqlite();
                this._enableForeignKeysIfSqlite();
                if (syncSucceeded) this._checkForeignKeyIntegrityIfSqlite();
            })
    }

    // The tx pull's upper bound is the server's `now - 10s`, so records THIS sync uploaded
    // are stamped past it and the migration's full pull skips them — and the source DB,
    // their only other copy, has just been abandoned. Pull once more against a fresh
    // window to bring them across; checkpoints advanced during the full pull, so it is a
    // cheap delta.
    async _catchUpTxDataAfterMigration(allEntitiesMetaData, serverTimeAfterUpload) {
        let {syncDetails, endDateTime} = await this.getSyncDetails();
        // Both timestamps are server-issued, so this comparison is immune to device clock
        // skew. A short sync can leave the window still short of our own uploads; wait it
        // out rather than lose them, since the source DB is already gone.
        const shortfallMillis = moment(serverTimeAfterUpload).diff(moment(endDateTime));
        if (shortfallMillis > 0) {
            General.logInfo("SyncService",
                `Catch-up pull window is ${shortfallMillis}ms short of this sync's uploads — waiting`);
            await new Promise(resolve => setTimeout(resolve, shortfallMillis + 1000));
            ({syncDetails, endDateTime} = await this.getSyncDetails());
        }
        const currentVersionEntitySyncDetails = this.retainEntitiesPresentInCurrentVersion(syncDetails, allEntitiesMetaData);
        this.entitySyncStatusService.updateAsPerSyncDetails(currentVersionEntitySyncDetails);
        const syncDetailsWithPrivileges = this.entitySyncStatusService.removeRevokedPrivileges(
            allEntitiesMetaData, currentVersionEntitySyncDetails);
        const txMetadata = this.getMetadataByType(
            _.filter(allEntitiesMetaData, ({entityName}) =>
                !_.includes(['ResetSync', 'SubjectMigration'], entityName)
                && _.find(syncDetails, sd => sd.entityName === entityName)), "tx");
        // Progress is deliberately not reported — the bar has already accounted for
        // these entities once and would overshoot.
        return this.getTxData(txMetadata, _.noop, syncDetailsWithPrivileges, endDateTime);
    }

    /**
     * Flip migration state from PENDING_TARGET_SYNC to IDLE after the full download
     * pipeline completes successfully. Called from the final .then of downloadSyncData
     * when a mid-sync switch happened in this sync.
     */
    async _finalizeMigrationState() {
        try {
            const migrationService = this.getService('sqliteMigrationService');
            if (!migrationService) return;
            const state = await migrationService.getState();
            state.activeBackend = 'sqlite';
            state.desiredBackend = 'sqlite';
            state.phase = 'idle';
            state.lastError = null;
            await migrationService.persistState(state);
            General.logInfo("SyncService", "Mid-sync migration finalised — state=idle, activeBackend=sqlite");
        } catch (e) {
            General.logWarn("SyncService", `Finalise migration state failed: ${e.message}`);
        }
    }

    downloadExtensions() {
        this.extensionService.downloadExtensions();
    }

    downloadContent(statusMessageCallBack) {
        return this.downloadableContentService.downloadContent(statusMessageCallBack);
    }

    downloadCustomCardHtmlFiles() {
        this.customCardConfigService.downloadHtmlFiles();
    }

    downloadFormShareTemplates() {
        return this.formShareTemplateService.downloadHtmlFiles();
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

    downloadConceptMedia() {
        const PARALLEL_DOWNLOAD_COUNT = 1;
        General.logDebug("SyncService", "Starting to download concept media (images and videos)");
        const conceptsWithMedia = this.conceptService.getAllConceptsWithIcon();
        General.logDebug("SyncService", `Found ${conceptsWithMedia.length} concepts with media`);
        
        const allMediaItems = [];
        conceptsWithMedia.forEach(concept => {
            if (concept.media && concept.media.length > 0) {
                concept.media.forEach(mediaItem => {
                    if (mediaItem.url) {
                        allMediaItems.push({
                            url: mediaItem.url,
                            type: mediaItem.type,
                            conceptName: concept.name
                        });
                    }
                });
            }
        });
        
        General.logDebug("SyncService", `Found ${allMediaItems.length} media items to download`);
        
        if (allMediaItems.length === 0) {
            return Promise.resolve([]);
        }

        const chunkedMediaItems = _.chunk(allMediaItems, PARALLEL_DOWNLOAD_COUNT);
        
        const downloadChunk = (chunk) => {
            return Promise.all(chunk.map(mediaItem => {
                return this.mediaService.downloadFileIfRequired(mediaItem.url, 'Metadata', false)
                    .catch(error => {
                        General.logError("SyncService", `Failed to download ${mediaItem.type} for concept '${mediaItem.conceptName}': ${mediaItem.url}`, error);
                        throw new Error(`Failed to download ${mediaItem.type} for concept '${mediaItem.conceptName}': ${error.message}`);
                    });
            }));
        };
        
        let promise = Promise.resolve();
        chunkedMediaItems.forEach(chunk => {
            promise = promise.then(() => downloadChunk(chunk));
        });
        
        return promise;
    }

    downloadIcons() {
        General.logDebug("SyncService", "Starting downloadIcons method");

        return Promise.all([
            this.downloadSubjectTypeIcons(),
            this.downloadConceptMedia()
        ]).then(results => {
            const [subjectTypeIconResults, conceptMediaResults] = results;
            General.logDebug("SyncService", `Downloaded ${subjectTypeIconResults.length} subject type icons and ${conceptMediaResults.length} concept media items`);
            return [...subjectTypeIconResults, ...conceptMediaResults];
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

    _parentStoresChildAsJsonArray(entityMetaData) {
        return !_.isNil(jsonArrayListPropFor(entityMetaData.parent.schemaName, entityMetaData.schemaName));
    }

    _refreshParentCacheForJsonArray(entityMetaData, mergedParents) {
        if (typeof this.db.getCachedEntity !== 'function') return;
        const parentSchema = entityMetaData.parent.schemaName;
        const listProp = jsonArrayListPropFor(parentSchema, entityMetaData.schemaName);
        if (!listProp) return;
        mergedParents.forEach(parent => {
            const cached = this.db.getCachedEntity(parentSchema, parent.uuid);
            if (cached) {
                const data = parent.that || parent;
                cached.that[listProp] = data[listProp];
            }
        });
    }

    async persistAll(entityMetaData, entityResources) {
        if (_.isEmpty(entityResources)) return;
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const loadedSince = _.last(entityResources).lastModifiedDateTime;

        const entities = entityResources.reduce(transformResourceToEntity.call(this, entityMetaData, entityResources), []);
        const initialLength = entityResources.length;
        entityResources = _.filter(entityResources, (resource) => !resource.excludeFromPersist);
        General.logDebug("SyncService", `Before filter entityResources length: ${initialLength}, after filter entityResources length: ${entityResources.length}, entities length  ${entities.length}`);

        if (entityMetaData.nameTranslated) {
            entityResources.map((entity) => this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue));
        }

        // Handle special entity types
        if (entityMetaData.entityName === "TaskUnAssignment") {
            this.getService(TaskUnAssignmentService).deleteUnassignedTasks(entities);
        }
        if (entityMetaData.entityName === 'UserSubjectAssignment') {
            this.getService(UserSubjectAssignmentService).deleteUnassignedSubjectsAndDependents(entities);
        }

        General.logDebug("SyncService", `Syncing - ${entityMetaData.entityName} with subType: ${entityMetaData.syncStatus.entityTypeUuid}`);

        // Use batch path for SQLite — one native call for all entities via executeBatch
        if (this.db.isSqlite && typeof this.db.bulkCreate === 'function') {
            await this._persistAllBatch(entityMetaData, entityResources, entities, loadedSince);
        } else {
            this._persistAllSync(entityMetaData, entityResources, entities, loadedSince);
        }

        this.dispatchAction(SyncTelemetryActions.ENTITY_PULL_COMPLETED, {
            entityName: entityMetaData.entityName,
            numberOfPulledEntities: entities.length
        });
    }

    // FK-on-child relationships need no parent re-save, but JSON-array lists store
    // the link on the parent row (e.g. concept.answers), so re-save those parents.
    async _persistAllBatch(entityMetaData, entityResources, entities, loadedSince) {
        await this.db.bulkCreate(entityMetaData.schemaName, entities);

        if (!_.isEmpty(entityMetaData.parent) && this._parentStoresChildAsJsonArray(entityMetaData)) {
            const mergedParents = entityMetaData.hasMoreThanOneAssociation
                ? this.associateMultipleParents(entityResources, entities, entityMetaData)
                : this.associateParent(entityResources, entities, entityMetaData);
            await this.db.bulkCreate(entityMetaData.parent.schemaName, mergedParents);
            // Keep the cache in step so a later page doesn't overwrite what this one wrote.
            this._refreshParentCacheForJsonArray(entityMetaData, mergedParents);
        }

        // Update sync status (1 row)
        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName, entityMetaData.syncStatus.entityTypeUuid);
        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.entityName = entityMetaData.entityName;
        entitySyncStatus.entityTypeUuid = entityMetaData.syncStatus.entityTypeUuid;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(loadedSince);
        this.bulkSaveOrUpdate(this.getCreateEntityFunctions(EntitySyncStatus.schema.name, [entitySyncStatus]));
    }

    // Original sync path for Realm (synchronous)
    _persistAllSync(entityMetaData, entityResources, entities, loadedSince) {
        General.logDebug("SyncService", `Creating entity create functions for schema ${entityMetaData.schemaName}`);
        let entitiesToCreateFns = this.getCreateEntityFunctions(entityMetaData.schemaName, entities);

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

        const currentEntitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName, entityMetaData.syncStatus.entityTypeUuid);
        const entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.entityName = entityMetaData.entityName;
        entitySyncStatus.entityTypeUuid = entityMetaData.syncStatus.entityTypeUuid;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(loadedSince);
        General.logDebug("SyncService", `Creating entity create functions for ${currentEntitySyncStatus}`);
        this.bulkSaveOrUpdate(entitiesToCreateFns.concat(this.getCreateEntityFunctions(EntitySyncStatus.schema.name, [entitySyncStatus])));
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
            // Build the SQLite reference cache BEFORE reset(). The reset() call
            // dispatches RESET → LandingViewActions.ON_LOAD which triggers async
            // view reloads. If any of those reloads query forms/concepts before the
            // cache is ready, hydration falls back to uncached DB queries that may
            // return incomplete results (e.g., empty formElements).
            this._buildReferenceCacheIfSqlite();
            this.reset(false);
            this.getService(SettingsService).initLanguages();
            this.getService(AddressLevelService).clearHierarchyCache();
            General.logInfo("Sync", 'Full Sync completed, reset completed');
        }
    }

    /**
     * After reference data sync, check if the user should be migrated to SQLite.
     * If yes, switch backend and re-sync reference data + UserInfo on the new
     * backend so the heavy transactional data goes directly to SQLite.
     *
     * @returns {{ syncDetails, endDateTime }} if switched, null otherwise.
     *     Callers must update their local sync state with the returned values.
     */
    async _switchBackendAndResyncRefDataIfNeeded(statusMessageCallBack, onProgressPerEntity, allEntitiesMetaData) {
        const switched = await this._checkAndSwitchBackendMidSync(statusMessageCallBack);
        if (!switched) return null;

        // Re-sync reference data + UserInfo on the new SQLite backend.
        // entitySyncStatus was seeded with REALLY_OLD_DATE so all reference
        // entities will be re-fetched from the server.
        statusMessageCallBack("downloadForms");
        const {syncDetails, endDateTime, now} = await this.getSyncDetails();
        const filtered = _.filter(allEntitiesMetaData, ({entityName}) =>
            !_.includes(['ResetSync', 'SubjectMigration'], entityName) &&
            _.find(syncDetails, sd => sd.entityName === entityName));
        const refMetadata = this.getMetadataByType(filtered, "reference");
        const userInfoData = _.filter(filtered, ({entityName}) => entityName === "UserInfo");
        const currentVersionDetails = this.retainEntitiesPresentInCurrentVersion(syncDetails, allEntitiesMetaData);
        this.entitySyncStatusService.updateAsPerSyncDetails(currentVersionDetails);
        this._disableForeignKeysIfSqlite();
        this._enableShallowHydrationIfSqlite();
        await this.getTxData(userInfoData, onProgressPerEntity, syncDetails, endDateTime);
        await this.getRefData(refMetadata, onProgressPerEntity, now, endDateTime);
        this._buildReferenceCacheIfSqlite();

        // Pull ResetSyncs and mark them migrated like a fresh install, else the next sync sees them as not-migrated and wrongly resets
        const resetSyncMetadata = _.filter(allEntitiesMetaData, ({entityName}) => entityName === "ResetSync");
        await this.getResetSyncData(resetSyncMetadata, onProgressPerEntity);
        this.getService(ResetSyncService).markAllResetSyncsMigrated();

        // Re-persist migration state now that UserInfo is available on SQLite so
        // subsequent reads find the state under the SQLite-backed username key
        // (which should match the Realm-backed key, but this write is cheap insurance
        // against any drift). Phase stays at PENDING_TARGET_SYNC — the final flip to
        // IDLE happens in downloadSyncData's success .then after the tx data sync
        // completes. Persisting IDLE here would re-introduce the crash window the
        // PENDING_TARGET_SYNC state exists to close.
        try {
            const migrationService = this.getService('sqliteMigrationService');
            if (migrationService) {
                const state = await migrationService.getState();
                state.activeBackend = 'sqlite';
                state.desiredBackend = 'sqlite';
                state.phase = 'pending_target_sync';
                state.lastError = null;
                await migrationService.persistState(state);
            }
        } catch (e) {
            General.logWarn("SyncService", `Re-persist migration state failed: ${e.message}`);
        }

        return {syncDetails, endDateTime};
    }

    /**
     * Mid-sync migration check. Called after reference data sync (which includes
     * MyGroups) but before the heavy transactional data sync. If the user is in
     * the SQLite Migration group and the current backend is Realm, switches to
     * SQLite immediately so the transactional data goes directly to SQLite —
     * avoiding a full double sync on fresh installs.
     *
     * @returns {boolean} true if the backend was switched
     */
    async _checkAndSwitchBackendMidSync(statusMessageCallBack) {
        const GlobalContext = require('../GlobalContext').default;

        const migrationService = this.getService('sqliteMigrationService');
        if (!migrationService) return false;

        const desired = migrationService.computeDesiredBackend();
        const globalContext = GlobalContext.getInstance();

        if (desired !== 'sqlite' || globalContext.getActiveBackend() === 'sqlite') {
            return false;
        }

        // Migrating abandons the source DB and rebuilds the target from the server, so
        // anything still in the outbox exists nowhere else and would be lost. Defer the
        // switch — the next sync retries it once the upload has gone through.
        const pendingFieldData = this.entityQueueService.getPendingFieldDataCount();
        if (pendingFieldData > 0) {
            General.logWarn("SyncService",
                `Deferring SQLite migration: ${pendingFieldData} local changes still awaiting upload (${this.entityQueueService.getPendingFieldDataSummary()})`);
            return false;
        }

        General.logInfo("SyncService",
            "Mid-sync migration: switching to SQLite before transactional data sync");
        statusMessageCallBack('switchingBackendMessage');

        // Capture auth state from Realm Settings BEFORE the switch, and persist
        // migration state BEFORE switching. Persisting pre-switch uses the Realm
        // UserInfo (the real username) for the AsyncStorage key, so a resume after
        // any mid-switch failure finds the correct per-user state. The phase stays
        // at PENDING_TARGET_SYNC until downloadSyncData's final .then — until then,
        // any crash/failure is recoverable by resumeIfPending/resume().
        const authState = migrationService._captureAuthState();
        const state = await migrationService.getState();
        state.activeBackend = 'sqlite';
        state.desiredBackend = 'sqlite';
        state.phase = 'pending_target_sync';
        state.lastError = null;
        await migrationService.persistState(state);

        try {
            globalContext.switchBackend('sqlite');
            this.entitySyncStatusService.setup();
            await migrationService._bootstrapTargetSettings(authState);
        } catch (e) {
            // The backend has already been switched to SQLite, so "continue on current
            // backend" would mean continuing on SQLite without seeded sync status or
            // auth — not safe. Propagate the failure so the sync fails visibly; state
            // is already PENDING_TARGET_SYNC so resume() can retry from here.
            General.logError("SyncService",
                `Mid-sync migration switch failed after backend swap: ${e.message}`);
            throw e;
        }

        General.logInfo("SyncService",
            "Mid-sync migration switch complete — continuing sync on SQLite");
        return true;
    }

    _disableForeignKeysIfSqlite() {
        if (this.context.getRepositoryFactory().setForeignKeysEnabled(false)) {
            General.logDebug("SyncService", "SQLite foreign keys disabled for sync");
        }
    }

    _enableForeignKeysIfSqlite() {
        if (this.context.getRepositoryFactory().setForeignKeysEnabled(true)) {
            General.logDebug("SyncService", "SQLite foreign keys re-enabled after sync");
        }
    }

    /**
     * During sync, openchs-models' fromResource calls findByKey("uuid", parentUuid,
     * ParentSchema) for every synced child entity. Without shallow mode, each call
     * triggers SqliteResultsProxy's deep batchPreload — fetching the parent's
     * entire 3-level subtree (e.g., an Individual's 400 encounters + their concept
     * refs) on every sync entity. The result is only used for its uuid (to populate
     * a FK column via bulkCreate), so the deep hydration is wasted work.
     */
    _enableShallowHydrationIfSqlite() {
        if (this.context.getRepositoryFactory().setShallowHydrationMode(true)) {
            General.logDebug("SyncService", "SQLite shallow hydration enabled");
        }
    }

    _disableShallowHydrationIfSqlite() {
        if (this.context.getRepositoryFactory().setShallowHydrationMode(false)) {
            General.logDebug("SyncService", "SQLite shallow hydration disabled");
        }
    }

    /**
     * Post-sync FK integrity check. Runs PRAGMA foreign_key_check which scans
     * all FK columns and reports violations — without failing the sync or rolling
     * back any data. Violations indicate a server-side ordering bug and are
     * reported via Bugsnag + logs for investigation.
     */
    _checkForeignKeyIntegrityIfSqlite() {
        try {
            const violations = this.context.getRepositoryFactory().runForeignKeyCheck();
            if (violations && violations.length > 0) {
                const summary = violations.slice(0, 10).map(v =>
                    `${v.table}.rowid=${v.rowid}→${v.parent}`
                ).join(', ');
                const message = `${violations.length} FK violation(s) after sync: ${summary}`;
                General.logError("SyncService", message);
                ErrorUtil.notifyBugsnag(new Error(message), "SyncService::FKIntegrityCheck");
            }
        } catch (e) {
            General.logWarn("SyncService", `FK integrity check failed: ${e.message}`);
        }
    }

    _buildReferenceCacheIfSqlite() {
        const cacheConfigs = [
            {schemaName: 'Gender', depth: 1, skipLists: true},
            {schemaName: 'SubjectType', depth: 1, skipLists: true},
            {schemaName: 'Program', depth: 1, skipLists: true},
            {schemaName: 'EncounterType', depth: 1, skipLists: true},
            {schemaName: 'OrganisationConfig', depth: 1, skipLists: true},
            {schemaName: 'IndividualRelation', depth: 1, skipLists: true},
            {schemaName: 'IndividualRelationGenderMapping', depth: 1, skipLists: true},
            {schemaName: 'IndividualRelationshipType', depth: 1, skipLists: true},
            {schemaName: 'GroupRole', depth: 1, skipLists: true},
            {schemaName: 'Concept', depth: 2, skipLists: false},
            {schemaName: 'ChecklistItemDetail', depth: 1, skipLists: false},
            {schemaName: 'Form', depth: 3, skipLists: false},
        ];

        const start = Date.now();
        if (this.context.getRepositoryFactory().buildReferenceCache(cacheConfigs)) {
            General.logDebug("Sync", `SQLite reference cache built in ${Date.now() - start} ms`);
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
        // Skip dashboard data loading during post-sync reset.
        // Dashboard views will load their data when the user navigates to them.
        // This avoids hydrating 100K+ entities (34-40s delay) before the sync
        // complete screen can be dismissed.
    }
}

export default SyncService;
