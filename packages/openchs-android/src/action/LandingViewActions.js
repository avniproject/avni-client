class LandingViewActions {
    static getInitialState() {
        return {dummy: false};
    }

    static onLoad(state) {
        return {dummy: !state.dummy};
    }
}

const LandingViewActionsNames = {
    ON_LOAD: 'LVA.ON_LOAD',
};

const LandingViewActionsMap = new Map([
    [LandingViewActionsNames.ON_LOAD, LandingViewActions.onLoad]
]);

export {
    LandingViewActions,
    LandingViewActionsNames,
    LandingViewActionsMap
};