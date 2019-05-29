class MenuViewActions {
    static getInitialState(context) {
        return {
            progress: 0,
            message: ''
        };
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

const ActionPrefix = 'Menu';
const MenuActions = {
    ON_UPDATE: `${ActionPrefix}.ON_UPDATE`,
    ON_MESSAGE_CALLBACK: `${ActionPrefix}.ON_MESSAGE_CALLBACK`
};
const MenuActionMap = new Map([
    [MenuActions.ON_UPDATE, MenuViewActions.onUpdate],
    [MenuActions.ON_MESSAGE_CALLBACK, MenuViewActions.onMessageCallback],
]);

export {
    MenuViewActions, ActionPrefix, MenuActions, MenuActionMap
};
