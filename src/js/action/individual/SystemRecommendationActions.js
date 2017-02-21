import IndividualEncounterService from "../../service/IndividualEncounterService";
export class SystemRecommendationActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const newState = {};
        newState.encounter = action.encounter.cloneForNewEncounter();
        newState.encounterDecisions = action.encounterDecisions;
        newState.formElementGroup = action.formElementGroup;
        return newState;
    }

    static onSave(state, action, context) {
        const newState = {};
        newState.encounter = state.encounter.cloneForNewEncounter();
        newState.encounterDecisions = state.encounterDecisions;
        newState.formElementGroup = state.formElementGroup;
        context.get(IndividualEncounterService).saveOrUpdate(newState.encounter);
        action.cb();
        return newState;
    }
}

const actions = {
    ON_LOAD: 'f5f39edb-40c2-428b-b948-4dd64fe1f396',
    SAVE: '54cf1bcb-63d8-4604-b7fc-68e6d19d423c'
};

export default new Map([
    [actions.ON_LOAD, SystemRecommendationActions.onLoad],
    [actions.SAVE, SystemRecommendationActions.onSave]
]);

export {actions as Actions};