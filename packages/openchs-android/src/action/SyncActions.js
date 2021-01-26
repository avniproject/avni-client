import moment from "moment";
import {firebaseEvents, logEvent} from "../utility/Analytics";

class SyncActions {

    static getInitialState() {
        return {
            syncing: false,
            isConnected: true,
            progress: 0,
            message: '',
            syncMessage: '',
            startSync: false
        };
    }

    static preSync(state) {
        const startTime = Date.now();
        return {...state, syncing: true, syncMessage: "syncingData", startTime};
    }

    static postSync(state) {
        return {...state, syncing: false, startSync: false};
    }

    static onError(state) {
        const dateTimeFormat = "DD MMM YYYY hh:mm:ss a";
        const syncStartTime = moment(state.startTime).format(dateTimeFormat);
        const errorTime = Date.now();
        const syncTime = errorTime - state.startTime;
        const params = {
            time_taken: syncTime,
            sync_start_time: syncStartTime,
            error_time: moment(errorTime).format(dateTimeFormat)
        };
        logEvent(firebaseEvents.SYNC_FAILED, params);
        return {...state, syncing: false};
    }

    static onConnectionChange(state, action) {
        return {...state, isConnected: action.isConnected}
    }

    static onUpdate(state, action, context) {
        return {
            ...state,
            progress: action.progress
        }
    }

    static onMessageCallback(state, action, context) {
        return {
            ...state,
            message: action.message
        }
    }
}

const ActionPrefix = "SYNC";

const SyncActionNames = {
    PRE_SYNC: `${ActionPrefix}.PRE_SYNC`,
    POST_SYNC: `${ActionPrefix}.POST_SYNC`,
    ON_ERROR: `${ActionPrefix}.ON_ERROR`,
    ON_CONNECTION_CHANGE: `${ActionPrefix}.ON_CONNECTION_CHANGE`,
    ON_UPDATE: `${ActionPrefix}.ON_UPDATE`,
    ON_MESSAGE_CALLBACK: `${ActionPrefix}.ON_MESSAGE_CALLBACK`
};

const SyncActionMap = new Map([
    [SyncActionNames.PRE_SYNC, SyncActions.preSync],
    [SyncActionNames.POST_SYNC, SyncActions.postSync],
    [SyncActionNames.ON_ERROR, SyncActions.onError],
    [SyncActionNames.ON_CONNECTION_CHANGE, SyncActions.onConnectionChange],
    [SyncActionNames.ON_UPDATE, SyncActions.onUpdate],
    [SyncActionNames.ON_MESSAGE_CALLBACK, SyncActions.onMessageCallback],
]);

export {
    SyncActions,
    SyncActionMap,
    SyncActionNames
}
