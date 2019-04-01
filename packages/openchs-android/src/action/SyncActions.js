import {SyncTelemetry} from "openchs-models";
import _ from "lodash";
import {NativeModules} from "react-native";
import EntityService from "../service/EntityService";

const {DeviceInfo} = NativeModules;

class SyncActions {
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
        const newState = SyncActions.clone(state);
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
        const newState = SyncActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;

        const entityStatus = syncTelemetry.getEntityStatus();
        const pushEntity = _.find(entityStatus.push, e => e.entity === action.entityMetadata.entityName);
        pushEntity.done = pushEntity.done + 1;
        syncTelemetry.setEntityStatus(entityStatus);

        return newState;
    }

    static recordFirstPageOfPull(state, action, context) {
        const newState = SyncActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;

        const entityStatus = syncTelemetry.getEntityStatus();
        const pullEntity = _.find(entityStatus.pull, e => e.entity === action.entityName);
        pullEntity.todo = pullEntity.todo + action.totalElements;
        syncTelemetry.setEntityStatus(entityStatus);

        return newState;
    }

    static entityPullCompleted(state, {entityName, numberOfPulledEntities}, context) {
        const newState = SyncActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;

        const entityStatus = syncTelemetry.getEntityStatus();
        const pullEntity = _.find(entityStatus.pull, e => e.entity === entityName);
        pullEntity.done = pullEntity.done + numberOfPulledEntities;
        syncTelemetry.setEntityStatus(entityStatus);

        return newState;
    }

    static syncCompleted(state, action, context) {
        const newState = SyncActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;
        syncTelemetry.syncStatus = "complete";
        syncTelemetry.syncEndTime = new Date();

        const entityService = context.get(EntityService);
        entityService.saveAndPushToEntityQueue(syncTelemetry, SyncTelemetry.schema.name);

        return newState;
    }

    static syncFailed(state, action, context) {
        const newState = SyncActions.clone(state);
        const syncTelemetry = newState.syncTelemetry;
        const entityService = context.get(EntityService);
        entityService.saveAndPushToEntityQueue(syncTelemetry, SyncTelemetry.schema.name);
        return newState;
    }
}

const SyncActionNames = {
    RECORD_PUSH_TODO_TELEMETRY: 'SyncActions.RECORD_PUSH_TODO_TELEMETRY',
    ENTITY_PUSH_COMPLETED: 'SyncActions.ENTITY_PUSH_COMPLETED',
    RECORD_FIRST_PAGE_OF_PULL: 'SyncActions.RECORD_FIRST_PAGE_OF_PULL',
    ENTITY_PULL_COMPLETED: 'SyncActions.ENTITY_PULL_COMPLETED',
    SYNC_COMPLETED: 'SyncActions.SYNC_COMPLETED',
    SYNC_FAILED: 'SyncActions.SYNC_FAILED',
    START_SYNC: 'SyncActions.START_SYNC'
};

const SyncActionsMap = new Map([
    [SyncActionNames.RECORD_PUSH_TODO_TELEMETRY, SyncActions.recordPushTodoTelemetry],
    [SyncActionNames.ENTITY_PUSH_COMPLETED, SyncActions.entityPushCompleted],
    [SyncActionNames.RECORD_FIRST_PAGE_OF_PULL, SyncActions.recordFirstPageOfPull],
    [SyncActionNames.ENTITY_PULL_COMPLETED, SyncActions.entityPullCompleted],
    [SyncActionNames.SYNC_COMPLETED, SyncActions.syncCompleted],
    [SyncActionNames.SYNC_FAILED, SyncActions.syncFailed],
    [SyncActionNames.START_SYNC, SyncActions.getInitialState],
]);

export {
    SyncActions,
    SyncActionNames,
    SyncActionsMap
};