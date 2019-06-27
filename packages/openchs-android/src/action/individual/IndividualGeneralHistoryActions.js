import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";
import SettingsService from "../../service/SettingsService";
import _ from 'lodash'

export class IndividualGeneralHistoryActions {
    static getInitialState() {
        return {
            encounters: []
        };
    }

    static loadHistory(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individualUUID);
        const encounters = _.map(individual.nonVoidedEncounters(), encounter => ({encounter, expand: false}));
        return {
            programsAvailable: context.get(ProgramService).programsAvailable,
            showCount: SettingsService.IncrementalEncounterDisplayCount,
            individual,
            encounters
        };
    }

    static clone(state) {
        return {
            individual: state.individual,
            programsAvailable: state.programsAvailable,
            showCount: state.showCount
        };
    }

    static onShowMore(state) {
        const newState = IndividualGeneralHistoryActions.clone(state);
        newState.showCount = state.showCount + SettingsService.IncrementalEncounterDisplayCount;
        return newState;
    }

    static onToggle(state, action) {
        const nonEqual = _.filter(state.encounters, (e) => !_.isEqualWith(e, action.encounterInfo, (e1, e2) => e1.encounter.uuid === e2.encounter.uuid));
        const encounters = [...nonEqual, action.encounterInfo];
        return {...state, encounters};
    }
}

const actions = {
    LOAD_HISTORY: "IGHA.LOAD_HISTORY",
    SHOW_MORE: "IGHA.SHOW_MORE",
    ON_TOGGLE: "IGHA.ON_TOGGLE",
};

export default new Map([
    [actions.LOAD_HISTORY, IndividualGeneralHistoryActions.loadHistory],
    [actions.SHOW_MORE, IndividualGeneralHistoryActions.onShowMore],
    [actions.ON_TOGGLE, IndividualGeneralHistoryActions.onToggle],
]);

export {actions as Actions};
