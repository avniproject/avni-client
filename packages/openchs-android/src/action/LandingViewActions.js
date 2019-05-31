class LandingViewActions {
    static getInitialState() {
        return {
            dummy: false,
            home: false,
            search: false,
            register: false,
            menu: false,
            progress: 0,
            message: '',
        };
    }

    static reset(state) {
        return {
            ...state,
            home: false,
            search: false,
            register: false,
            menu: false
        }
    }

    static onLoad(state) {
        const newState = LandingViewActions.reset(state);
        return {
            ...newState,
            dummy: !state.dummy,
            home: true
        };
    }

    static onHomeClick(state) {
        const newState = LandingViewActions.reset(state);
        return {
            ...newState,
            home: true,
        }
    }

    static onSearchClick(state) {
        const newState = LandingViewActions.reset(state);
        return {
            ...newState,
            search: true,
        }
    }

    static onRegisterClick(state) {
        const newState = LandingViewActions.reset(state);
        return {
            ...newState,
            register: true,
        }
    }

    static onMenuClick(state) {
        const newState = LandingViewActions.reset(state);
        return {
            ...newState,
            menu: true,
        }
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

const LandingViewActionsNames = {
    ON_LOAD: 'LVA.ON_LOAD',
    ON_HOME_CLICK: 'LVA.ON_HOME_CLICK',
    ON_SEARCH_CLICK: 'LVA.ON_SEARCH_CLICK',
    ON_REGISTER_CLICK: 'LVA.ON_REGISTER_CLICK',
    ON_MENU_CLICK: 'LVA.ON_MENU_CLICK',
    ON_UPDATE: `LVA.ON_UPDATE`,
    ON_MESSAGE_CALLBACK: `LVA.ON_MESSAGE_CALLBACK`
};

const LandingViewActionsMap = new Map([
    [LandingViewActionsNames.ON_LOAD, LandingViewActions.onLoad],
    [LandingViewActionsNames.ON_HOME_CLICK, LandingViewActions.onHomeClick],
    [LandingViewActionsNames.ON_SEARCH_CLICK, LandingViewActions.onSearchClick],
    [LandingViewActionsNames.ON_REGISTER_CLICK, LandingViewActions.onRegisterClick],
    [LandingViewActionsNames.ON_MENU_CLICK, LandingViewActions.onMenuClick],
    [LandingViewActionsNames.ON_UPDATE, LandingViewActions.onUpdate],
    [LandingViewActionsNames.ON_MESSAGE_CALLBACK, LandingViewActions.onMessageCallback],
]);

export {
    LandingViewActions,
    LandingViewActionsNames,
    LandingViewActionsMap
};
