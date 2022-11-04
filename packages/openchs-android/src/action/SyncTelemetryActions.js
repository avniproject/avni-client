import {SyncTelemetry, Individual, ProgramEnrolment, ProgramEncounter, Encounter, EntityMetaData} from 'openchs-models';
import _ from "lodash";
import EntityService from "../service/EntityService";
import DeviceInfo from 'react-native-device-info';
import moment from "moment";
import SyncTelemetryService from "../service/SyncTelemetryService";
import SyncService from "../service/SyncService";

class SyncTelemetryActions {
    static getInitialState() {
        const syncTelemetry = SyncTelemetry.newInstance(EntityMetaData.model());
        syncTelemetry.appVersion = DeviceInfo.getVersion();
        syncTelemetry.androidVersion = DeviceInfo.getSystemVersion();
        syncTelemetry.deviceName = DeviceInfo.getDeviceId();
        syncTelemetry.deviceInfo = "{}";
        return {syncTelemetry};
    }

    static onSyncStart(state, action, context) {
        const newState = SyncTelemetryActions.getInitialState();
        const syncTelemetry = newState.syncTelemetry;
        const deviceInfo = SyncTelemetryActions.getDeviceInfo();
        const {type, effectiveType} = action.connectionInfo;
        deviceInfo.connectionType = type;
        deviceInfo.effectiveConnectionType = effectiveType;
        syncTelemetry.deviceInfo = JSON.stringify(deviceInfo);
        this.getUpdatedSyncSource(syncTelemetry, action, context);
        return newState;
    }

    /*
     * Return SyncService.syncSources.BACKGROUND_JOB in place of SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB,
     * if the last Completed Full Sync happened more than twelve hours ago
     */
    static getUpdatedSyncSource(syncTelemetry, action, context) {
        syncTelemetry.syncSource = (action.syncSource === SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB
          && SyncTelemetryActions.wasLastCompletedFullSyncDoneMoreThan12HoursAgo(context))
          ? action.syncSource : SyncService.syncSources.BACKGROUND_JOB;
    }

    static wasLastCompletedFullSyncDoneMoreThan12HoursAgo(context) {
        let lastSynced = context.get(SyncTelemetryService).getLastCompletedFullSync();
        return !_.isEmpty(lastSynced) && moment(lastSynced[0].syncEndTime).add(12, 'hours').isBefore(moment());
    }

    static getDeviceInfo() {
        const deviceInfo = {};
        deviceInfo.brand = DeviceInfo.getBrand();
        deviceInfo.manufacturer = DeviceInfo.getManufacturerSync();
        deviceInfo.deviceType = DeviceInfo.getDeviceType();
        deviceInfo.carrier = DeviceInfo.getCarrierSync();
        deviceInfo.isEmulator = DeviceInfo.isEmulatorSync();
        deviceInfo.powerState = DeviceInfo.getPowerStateSync();
        deviceInfo.freeDiskStorage = DeviceInfo.getFreeDiskStorageSync();
        deviceInfo.totalMemory = DeviceInfo.getTotalMemorySync();
        deviceInfo.maxMemory = DeviceInfo.getMaxMemorySync();
        deviceInfo.isPinOrFingerprintSet = DeviceInfo.isPinOrFingerprintSetSync();
        deviceInfo.isLocationEnabled = DeviceInfo.isLocationEnabledSync();
        deviceInfo.firstInstallTime = moment(DeviceInfo.getFirstInstallTimeSync()).format("DD MMM YYYY hh:mm a");
        deviceInfo.lastUpdateTime = moment(DeviceInfo.getLastUpdateTimeSync()).format("DD MMM YYYY hh:mm a");
        return deviceInfo;
    }

    static clone(state) {
        return {syncTelemetry: state.syncTelemetry.clone()};
    }

    static recordPushTodoTelemetry(state, {entitiesToPost}, context) {
        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;
        const entityStatus = syncTelemetry.getEntityStatus();
        entitiesToPost.forEach(entities => {
            const pushEntity = _.find(entityStatus.push, e => e.entity === entities.metaData.entityName);
            pushEntity.todo = pushEntity.todo + entities.entities.length;
        });
        syncTelemetry.setEntityStatus(entityStatus);
        return newState;
    }

    static entityPushCompleted(state, action, context) {
        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;

        const entityStatus = syncTelemetry.getEntityStatus();
        const pushEntity = _.find(entityStatus.push, e => e.entity === action.entityMetadata.entityName);
        pushEntity.done = pushEntity.done + 1;
        syncTelemetry.setEntityStatus(entityStatus);

        return newState;
    }

    static recordFirstPageOfPull(state, action, context) {
        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;

        const entityStatus = syncTelemetry.getEntityStatus();
        const pullEntity = _.find(entityStatus.pull, e => e.entity === action.entityName);
        pullEntity.todo = pullEntity.todo + action.totalElements;
        syncTelemetry.setEntityStatus(entityStatus);

        return newState;
    }

    static entityPullCompleted(state, {entityName, numberOfPulledEntities}, context) {
        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;

        const entityStatus = syncTelemetry.getEntityStatus();
        const pullEntity = _.find(entityStatus.pull, e => e.entity === entityName);
        pullEntity.done = pullEntity.done + numberOfPulledEntities;
        syncTelemetry.setEntityStatus(entityStatus);

        return newState;
    }

    static syncCompleted(state, action, context) {
        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;
        syncTelemetry.syncStatus = "complete";
        syncTelemetry.syncEndTime = new Date();

        const entityService = context.get(EntityService);

        const entityStatus = syncTelemetry.getEntityStatus();
        entityStatus.totalCounts = {
            subjects: entityService.getCount(Individual.schema.name),
            programEnrolments: entityService.getCount(ProgramEnrolment.schema.name),
            programEncounters: entityService.getCount(ProgramEncounter.schema.name),
            encounters: entityService.getCount(Encounter.schema.name)
        };
        syncTelemetry.setEntityStatus(entityStatus);

        entityService.saveAndPushToEntityQueue(syncTelemetry, SyncTelemetry.schema.name);

        return newState;
    }

    static syncFailed(state, action, context) {
        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;
        const entityService = context.get(EntityService);
        entityService.saveAndPushToEntityQueue(syncTelemetry, SyncTelemetry.schema.name);
        return newState;
    }
}

const SyncTelemetryActionNames = {
    RECORD_PUSH_TODO_TELEMETRY: 'SyncTelemetryActions.RECORD_PUSH_TODO_TELEMETRY',
    ENTITY_PUSH_COMPLETED: 'SyncTelemetryActions.ENTITY_PUSH_COMPLETED',
    RECORD_FIRST_PAGE_OF_PULL: 'SyncTelemetryActions.RECORD_FIRST_PAGE_OF_PULL',
    ENTITY_PULL_COMPLETED: 'SyncTelemetryActions.ENTITY_PULL_COMPLETED',
    SYNC_COMPLETED: 'SyncTelemetryActions.SYNC_COMPLETED',
    SYNC_FAILED: 'SyncTelemetryActions.SYNC_FAILED',
    START_SYNC: 'SyncTelemetryActions.START_SYNC'
};

const SyncTelemetryActionsMap = new Map([
    [SyncTelemetryActionNames.RECORD_PUSH_TODO_TELEMETRY, SyncTelemetryActions.recordPushTodoTelemetry],
    [SyncTelemetryActionNames.ENTITY_PUSH_COMPLETED, SyncTelemetryActions.entityPushCompleted],
    [SyncTelemetryActionNames.RECORD_FIRST_PAGE_OF_PULL, SyncTelemetryActions.recordFirstPageOfPull],
    [SyncTelemetryActionNames.ENTITY_PULL_COMPLETED, SyncTelemetryActions.entityPullCompleted],
    [SyncTelemetryActionNames.SYNC_COMPLETED, SyncTelemetryActions.syncCompleted],
    [SyncTelemetryActionNames.SYNC_FAILED, SyncTelemetryActions.syncFailed],
    [SyncTelemetryActionNames.START_SYNC, SyncTelemetryActions.onSyncStart],
]);

export {
    SyncTelemetryActions,
    SyncTelemetryActionNames,
    SyncTelemetryActionsMap
};
