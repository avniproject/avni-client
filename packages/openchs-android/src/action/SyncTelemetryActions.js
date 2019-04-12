import {SyncTelemetry} from "openchs-models";
import _ from "lodash";
import DeviceInfo from "../framework/device-info";
import EntityService from "../service/EntityService";

class SyncTelemetryActions {
    static getInitialState() {
        const syncTelemetry = SyncTelemetry.newInstance();
        syncTelemetry.appVersion = DeviceInfo.versionName;
        syncTelemetry.androidVersion = DeviceInfo.releaseVersion;
        syncTelemetry.deviceName = DeviceInfo.deviceName;
        return {syncTelemetry};
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
    [SyncTelemetryActionNames.START_SYNC, SyncTelemetryActions.getInitialState],
]);

export {
    SyncTelemetryActions,
    SyncTelemetryActionNames,
    SyncTelemetryActionsMap
};