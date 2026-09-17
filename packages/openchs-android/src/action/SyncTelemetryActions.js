import {Encounter, EntityMetaData, Individual, ProgramEncounter, ProgramEnrolment, SyncTelemetry} from 'openchs-models';
import _ from "lodash";
import EntityService from "../service/EntityService";
import DeviceInfo from 'react-native-device-info';
import moment from "moment";
import {getUnknownConnectionInfo} from "../utility/ConnectionInfo";

class SyncTelemetryActions {
    static getInitialState() {
        const syncTelemetry = SyncTelemetry.newInstance(EntityMetaData.model());
        syncTelemetry.appVersion = DeviceInfo.getVersion();
        syncTelemetry.androidVersion = DeviceInfo.getSystemVersion();
        syncTelemetry.deviceName = DeviceInfo.getDeviceId();
        syncTelemetry.deviceInfo = "{}";
        syncTelemetry.appInfo = "{}";
        // Phase keys are written only onto entities that did something. An absent key reads as
        // zero; whether the row reports phases at all is settled by app_info, not by this object.
        // syncStarted is set only by START_SYNC. A fresh row is also "incomplete", so status alone
        // cannot tell a sync that ran from one that never started. #2097
        return {syncTelemetry, entityStatus: syncTelemetry.getEntityStatus(), syncStarted: false};
    }

    static onSyncStart(state, action, context) {
        const newState = SyncTelemetryActions.getInitialState();
        const syncTelemetry = newState.syncTelemetry;
        const deviceInfo = SyncTelemetryActions.getDeviceInfo();
        const {type, effectiveType} = action.connectionInfo || getUnknownConnectionInfo();
        deviceInfo.connectionType = type;
        deviceInfo.effectiveConnectionType = effectiveType;
        syncTelemetry.deviceInfo = JSON.stringify(deviceInfo);
        syncTelemetry.appInfo = JSON.stringify(action.appInfo);
        syncTelemetry.syncSource = action.syncSource
        newState.syncStarted = true;
        return newState;
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
        deviceInfo.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return deviceInfo;
    }

    static clone(state) {
        // entityStatus is carried by reference and mutated in place: ENTITY_PUSH_COMPLETED fires
        // once per pushed record, so it is stringified only at the two points that persist the row.
        return {syncTelemetry: state.syncTelemetry.clone(), entityStatus: state.entityStatus, syncStarted: state.syncStarted};
    }

    // countKey names the unit the phases were sampled in - pages on pull, posts on push - so a
    // mean is only ever taken over one rail's own unit. It counts completed round trips: a post
    // that dropOnFailure abandoned reports only its pop, and must not deflate ms per post.
    static addDurations(entityEntry, durations, countKey) {
        _.forEach(durations, (ms, phase) => {
            if (!_.isFinite(ms)) return;
            // Re-rounded on every add: summing one-decimal floats otherwise trails binary noise
            // into the stored JSON.
            entityEntry[phase] = Math.round(((entityEntry[phase] || 0) + ms) * 10) / 10;
        });
        if (countKey && _.isFinite(_.get(durations, 'networkMs'))) {
            entityEntry[countKey] = (entityEntry[countKey] || 0) + 1;
        }
    }

    // Encounters and subjects are pulled once per type, so the split already exists at dispatch
    // time; only the aggregate was being kept. Entities with no subtype carry an empty uuid.
    static typeEntry(entityEntry, entityTypeUuid) {
        if (_.isEmpty(entityTypeUuid)) return undefined;
        entityEntry.byType = entityEntry.byType || {};
        entityEntry.byType[entityTypeUuid] = entityEntry.byType[entityTypeUuid] || {todo: 0, done: 0};
        return entityEntry.byType[entityTypeUuid];
    }

    static recordPushTodoTelemetry(state, {entitiesToPost, readDurations}, context) {
        const newState = SyncTelemetryActions.clone(state);
        entitiesToPost.forEach(entityCollectionOfAType => {
            const pushEntity = _.find(newState.entityStatus.push, e => e.entity === entityCollectionOfAType.metaData.entityName);
            pushEntity.todo = pushEntity.todo + entityCollectionOfAType.entities.length;
        });
        // Reading the queue converts every record to its resource up front, which on a large push
        // costs more than the posts do. It happens once per entity type, so it carries no count.
        _.forEach(readDurations, (ms, entityName) => {
            const pushEntity = _.find(newState.entityStatus.push, e => e.entity === entityName);
            SyncTelemetryActions.addDurations(pushEntity, {readMs: ms});
        });
        return newState;
    }

    static entityPushCompleted(state, action, context) {
        const newState = SyncTelemetryActions.clone(state);

        const pushEntity = _.find(newState.entityStatus.push, e => e.entity === action.entityMetadata.entityName);
        pushEntity.done = pushEntity.done + 1;
        SyncTelemetryActions.addDurations(pushEntity, action.durations, 'posts');

        return newState;
    }

    static recordFirstPageOfPull(state, action, context) {
        const newState = SyncTelemetryActions.clone(state);

        const pullEntity = _.find(newState.entityStatus.pull, e => e.entity === action.entityName);
        pullEntity.todo = pullEntity.todo + action.totalElements;

        const typeEntry = SyncTelemetryActions.typeEntry(pullEntity, action.entityTypeUuid);
        if (typeEntry) typeEntry.todo = typeEntry.todo + action.totalElements;

        return newState;
    }

    static entityPullCompleted(state, {entityName, numberOfPulledEntities, durations, entityTypeUuid}, context) {
        const newState = SyncTelemetryActions.clone(state);

        const pullEntity = _.find(newState.entityStatus.pull, e => e.entity === entityName);
        pullEntity.done = pullEntity.done + numberOfPulledEntities;
        SyncTelemetryActions.addDurations(pullEntity, durations, 'pages');

        const typeEntry = SyncTelemetryActions.typeEntry(pullEntity, entityTypeUuid);
        if (typeEntry) {
            typeEntry.done = typeEntry.done + numberOfPulledEntities;
            SyncTelemetryActions.addDurations(typeEntry, durations, 'pages');
        }

        return newState;
    }

    static syncCompleted(state, action, context) {
        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;
        syncTelemetry.syncStatus = "complete";
        syncTelemetry.syncEndTime = new Date();

        const entityService = context.get(EntityService);

        // Update activeBackend to reflect the actual backend at sync completion.
        // A mid-sync migration may have switched from Realm to SQLite after the
        // initial appInfo was recorded at START_SYNC.
        try {
            const appInfo = JSON.parse(syncTelemetry.appInfo || '{}');
            appInfo.activeBackend = entityService.db && entityService.db.isSqlite ? 'sqlite' : 'realm';
            syncTelemetry.appInfo = JSON.stringify(appInfo);
        } catch (e) { /* ignore — telemetry is best-effort */ }

        // Use count() (SELECT COUNT) when available to avoid hydrating entire tables.
        // Realm's getCount() uses .length on lazy results which is already O(1).
        const countFor = (schema) => {
            const all = entityService.getAll(schema);
            return (typeof all.count === 'function') ? all.count() : all.length;
        };

        const entityStatus = newState.entityStatus;
        entityStatus.totalCounts = {
            subjects: countFor(Individual.schema.name),
            programEnrolments: countFor(ProgramEnrolment.schema.name),
            programEncounters: countFor(ProgramEncounter.schema.name),
            encounters: countFor(Encounter.schema.name)
        };
        syncTelemetry.setEntityStatus(entityStatus);

        entityService.saveAndPushToEntityQueue(syncTelemetry, SyncTelemetry.schema.name);
        newState.syncStarted = false;

        return newState;
    }

    static syncFailed(state, action, context) {
        // Only a sync that actually started is ours to fail. Between syncs this slice holds
        // either the previous sync's row (clone() keeps its uuid, so saving it would overwrite
        // that finished row by primary key) or a fresh row that no sync ever used (saving it
        // sends the server a "failed" sync that never happened, with empty device and app
        // info). Both are reachable from SyncComponent.startSync's offline branch and from
        // SyncService.sync rejecting before it dispatches START_SYNC.
        if (!_.get(state, "syncStarted")) return state;

        const newState = SyncTelemetryActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;
        // "incomplete" keeps meaning "never finished, no error seen" — i.e. the user closed
        // the app. A sync that failed with an error is marked as such. #2097
        syncTelemetry.syncStatus = "failed";
        syncTelemetry.syncEndTime = new Date();
        // Nothing wrote entityStatus through during the sync, and a failed sync is exactly where
        // the per-entity counts and durations matter.
        syncTelemetry.setEntityStatus(newState.entityStatus);
        const entityService = context.get(EntityService);
        entityService.saveAndPushToEntityQueue(syncTelemetry, SyncTelemetry.schema.name);
        newState.syncStarted = false;
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
