class CompletedVisitsFilterAction {
    static getInitialState() {
        return {
            selectedEncounterType: null,
            encounterTypes: []
        };
    }

    static onLoad(state, action) {
        return {
            ...state,
            selectedEncounterType: action.selectedEncounterType,
            encounterTypes: action.encounterTypes
        }
    }

    static onVisitSelect(state, action) {
        const selectedEncounterType = state.encounterTypes.find(e => e.operationalEncounterTypeName === action.encounterTypeName);
        return {...state, selectedEncounterType}
    }
}

const prefix = 'CVFA';

const CompletedVisitsFilterActionNames = {
    ON_LOAD: `${prefix}.ON_LOAD`,
    ON_VISIT_SELECT: `${prefix}.ON_VISIT_SELECT`,
};
const CompletedVisitsFilterActionMap = new Map([
    [CompletedVisitsFilterActionNames.ON_LOAD, CompletedVisitsFilterAction.onLoad],
    [CompletedVisitsFilterActionNames.ON_VISIT_SELECT, CompletedVisitsFilterAction.onVisitSelect],
]);
export {CompletedVisitsFilterAction, CompletedVisitsFilterActionMap, CompletedVisitsFilterActionNames}
