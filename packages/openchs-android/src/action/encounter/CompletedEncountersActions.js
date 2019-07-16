import _ from 'lodash';

class CompletedEncountersActions {

    static getInitialState() {
        return {
            encountersInfo: [],
            encounterTypes: [],
            selectedEncounterType: null,
            chronologicalEncounters: [],
            encountersToDisplay: [],
            totalToDisplay: 50
        };
    }

    static onLoad(state, action, context) {
        const encountersInfo = action.encountersInfo;
        const encounterTypes = _.uniqBy(_.map(encountersInfo, ({encounter}) => encounter.encounterType), 'uuid');
        const chronologicalEncounters = _.orderBy(encountersInfo.slice(0, 50), ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime, 'desc');
        const encountersToDisplay = chronologicalEncounters.slice(0, 5);
        return {...state, encountersInfo, encounterTypes, encountersToDisplay, chronologicalEncounters};
    }

    static handleMore(state) {
        const {chronologicalEncounters, encountersToDisplay} = state;
        const newEncounters = chronologicalEncounters.slice(5, state.totalToDisplay);
        return {
            ...state,
            encountersToDisplay: [...encountersToDisplay, ...newEncounters]
        }
    }

    static onExpandToggle(state, action, context) {
        const nonEqual = _.filter(state.encountersToDisplay, (e) => !_.isEqualWith(e, action.encounterInfo, (e1, e2) => e1.encounter.uuid === e2.encounter.uuid));
        const encountersToDisplay = _.orderBy([...nonEqual, action.encounterInfo], ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime, 'desc');
        return {...state, encountersToDisplay};
    }

    static onFilterApply(state, action) {
        const selectedEncounterType = action.selectedEncounterType;
        const encountersInfo = _.isNil(selectedEncounterType) ? state.encountersInfo : _.filter(state.encountersInfo, (e) => (e.encounter.encounterType.uuid === selectedEncounterType.uuid));
        const chronologicalEncounters = _.orderBy(encountersInfo.slice(0, 50), ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime, 'desc');
        const encountersToDisplay = chronologicalEncounters.slice(0, 5);
        return {...state, selectedEncounterType, chronologicalEncounters, encountersToDisplay}
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
    HANDLE_MORE: `${ActionPrefix}.HANDLE_MORE`,
};

const CompletedEncountersActionMap = new Map([
    [CompletedEncountersActionNames.ON_LOAD, CompletedEncountersActions.onLoad],
    [CompletedEncountersActionNames.ON_EXPAND_TOGGLE, CompletedEncountersActions.onExpandToggle],
    [CompletedEncountersActionNames.ON_FILTER_APPLY, CompletedEncountersActions.onFilterApply],
    [CompletedEncountersActionNames.RESET_FILTERS, CompletedEncountersActions.resetAppliedFilters],
    [CompletedEncountersActionNames.HANDLE_MORE, CompletedEncountersActions.handleMore],
]);

export {CompletedEncountersActions, CompletedEncountersActionNames, CompletedEncountersActionMap}
