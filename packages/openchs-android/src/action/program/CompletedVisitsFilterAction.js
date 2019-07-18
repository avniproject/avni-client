class CompletedVisitsFilterAction {
    static getInitialState() {
        return {
            encounterTypes: [],
            selectedEncounterTypes: []
        };
    }

    static onLoad(state, action) {
        return {
            ...state,
            encounterTypes: action.encounterTypes,
            selectedEncounterTypes: action.selectedEncounterTypes
        }
    }

    static onVisitSelect(state, action) {
        const selectedEncounterType = state.encounterTypes.find(e => e.operationalEncounterTypeName === action.encounterTypeName);
        const selectedEncounterTypes = _.includes(state.selectedEncounterTypes, selectedEncounterType) ?
            state.selectedEncounterTypes.filter(e => e.uuid !== selectedEncounterType.uuid) : [...state.selectedEncounterTypes, selectedEncounterType];
        return {...state, selectedEncounterType, selectedEncounterTypes};
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
