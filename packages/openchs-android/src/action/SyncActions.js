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
        return {...state, syncing: true, syncMessage: "syncingData"};
    }

    static postSync(state) {
        return {...state, syncing: false, startSync: false};
    }

    static onError(state) {
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
