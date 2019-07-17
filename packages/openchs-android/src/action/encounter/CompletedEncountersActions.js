import _ from 'lodash';

class CompletedEncountersActions {

    static getInitialState() {
        return {
            encountersInfo: [],
            encounterTypes: [],
            selectedEncounterType: null,
        };
    }

    static onLoad(state, action, context) {
        const encountersInfo = action.encountersInfo;
        const encounterTypes = _.uniqBy(_.map(encountersInfo, ({encounter}) => encounter.encounterType), 'uuid');
        return {...state, encountersInfo, encounterTypes};
    }

    static onExpandToggle(state, action, context) {
        const nonEqual = _.filter(state.encountersInfo, (e) => !_.isEqualWith(e, action.encounterInfo, (e1, e2) => e1.encounter.uuid === e2.encounter.uuid));
        const encountersInfo = [...nonEqual, action.encounterInfo];
        return {...state, encountersInfo};
    }

    static onFilterApply(state, action) {
        const selectedEncounterType = action.selectedEncounterType;
        return {...state, selectedEncounterType}
    }

    static resetAppliedFilters(state) {
        return {...state, selectedEncounterType: null}
    }
}

const ActionPrefix = 'CEA';
const CompletedEncountersActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_EXPAND_TOGGLE: `${ActionPrefix}.ON_EXPAND_TOGGLE`,
    ON_FILTER_APPLY: `${ActionPrefix}.ON_FILTER_APPLY`,
    RESET_FILTERS: `${ActionPrefix}.RESET_FILTERS`,
};

const CompletedEncountersActionMap = new Map([
    [CompletedEncountersActionNames.ON_LOAD, CompletedEncountersActions.onLoad],
    [CompletedEncountersActionNames.ON_EXPAND_TOGGLE, CompletedEncountersActions.onExpandToggle],
    [CompletedEncountersActionNames.ON_FILTER_APPLY, CompletedEncountersActions.onFilterApply],
    [CompletedEncountersActionNames.RESET_FILTERS, CompletedEncountersActions.resetAppliedFilters],
]);

export {CompletedEncountersActions, CompletedEncountersActionNames, CompletedEncountersActionMap}
