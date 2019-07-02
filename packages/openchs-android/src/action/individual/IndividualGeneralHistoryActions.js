import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";
import SettingsService from "../../service/SettingsService";
import _ from 'lodash'
import FormMappingService from "../../service/FormMappingService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Encounter} from "openchs-models";

export class IndividualGeneralHistoryActions {
    static getInitialState() {
        return {
            encounters: [],
            encounterTypes: [],
            displayActionSelector: false,
            encounter: Encounter.create(),
        };
    }

    static loadHistory(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individualUUID);
        const encounters = _.map(individual.nonVoidedEncounters(), encounter => ({encounter, expand: false}));
        const newState = IndividualGeneralHistoryActions.clone(state);
        newState.encounter.individual = individual;
        newState.encounterTypes = context.get(FormMappingService)
            .findEncounterTypesForEncounter(individual.subjectType)
            .filter(encounterType => context.get(RuleEvaluationService)
                .isEligibleForEncounter(individual, encounterType));
        newState.displayActionSelector = false;
        return {
            ...newState,
            programsAvailable: context.get(ProgramService).programsAvailable,
            showCount: SettingsService.IncrementalEncounterDisplayCount,
            individual,
            encounters,
        };
    }

    static clone(state) {
        return {
            individual: state.individual,
            programsAvailable: state.programsAvailable,
            showCount: state.showCount,
            encounter: state.encounter.cloneForEdit(),
            encounterTypes: state.encounterTypes.slice(),
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

    static hideEncounterSelector(state) {
        return {...state, displayActionSelector: false}
    }

    static launchEncounterSelector(state) {
        return {...state, displayActionSelector: true}
    }
}

const actions = {
    LOAD_HISTORY: "IGHA.LOAD_HISTORY",
    SHOW_MORE: "IGHA.SHOW_MORE",
    ON_TOGGLE: "IGHA.ON_TOGGLE",
    HIDE_ENCOUNTER_SELECTOR: "IGHA.HIDE_ENCOUNTER_SELECTOR",
    LAUNCH_ENCOUNTER_SELECTOR: "IGHA.LAUNCH_ENCOUNTER_SELECTOR",
};

export default new Map([
    [actions.LOAD_HISTORY, IndividualGeneralHistoryActions.loadHistory],
    [actions.SHOW_MORE, IndividualGeneralHistoryActions.onShowMore],
    [actions.ON_TOGGLE, IndividualGeneralHistoryActions.onToggle],
    [actions.HIDE_ENCOUNTER_SELECTOR, IndividualGeneralHistoryActions.hideEncounterSelector],
    [actions.LAUNCH_ENCOUNTER_SELECTOR, IndividualGeneralHistoryActions.launchEncounterSelector],
]);

export {actions as Actions};
