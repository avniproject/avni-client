import _ from 'lodash'

class LandingViewActions {
    static getInitialState() {
        return {
            dummy: false,
            home: false,
            search: false,
            register: false,
            menu: false,
            dashboard: false,
            syncRequired: true,
        };
    }

    static reset(state) {
        return {
            ...state,
            home: false,
            search: false,
            register: false,
            menu: false,
            dashboard: false,
        }
    }

    static onLoad(state, action) {
        const newState = LandingViewActions.reset(state);
        const syncRequired = _.isNil(action.syncRequired) ? true : action.syncRequired;
        return {
            ...newState,
            dummy: !state.dummy,
            home: true,
            syncRequired
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

    static onDashboardClick(state) {
        const newState = LandingViewActions.reset(state);
        return {
            ...newState,
            dashboard: true,
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
}

const LandingViewActionsNames = {
    ON_LOAD: 'LVA.ON_LOAD',
    ON_HOME_CLICK: 'LVA.ON_HOME_CLICK',
    ON_SEARCH_CLICK: 'LVA.ON_SEARCH_CLICK',
    ON_DASHBOARD_CLICK: 'LVA.ON_DASHBOARD_CLICK',
    ON_REGISTER_CLICK: 'LVA.ON_REGISTER_CLICK',
    ON_MENU_CLICK: 'LVA.ON_MENU_CLICK',
};

const LandingViewActionsMap = new Map([
    [LandingViewActionsNames.ON_LOAD, LandingViewActions.onLoad],
    [LandingViewActionsNames.ON_HOME_CLICK, LandingViewActions.onHomeClick],
    [LandingViewActionsNames.ON_SEARCH_CLICK, LandingViewActions.onSearchClick],
    [LandingViewActionsNames.ON_REGISTER_CLICK, LandingViewActions.onRegisterClick],
    [LandingViewActionsNames.ON_MENU_CLICK, LandingViewActions.onMenuClick],
    [LandingViewActionsNames.ON_DASHBOARD_CLICK, LandingViewActions.onDashboardClick],
]);

export {
    LandingViewActions,
    LandingViewActionsNames,
    LandingViewActionsMap
};
