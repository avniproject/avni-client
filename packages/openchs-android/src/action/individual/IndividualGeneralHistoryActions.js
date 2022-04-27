import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";
import SettingsService from "../../service/SettingsService";
import _ from 'lodash'
import FormMappingService from "../../service/FormMappingService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Encounter, Privilege} from "avni-models";
import Colors from "../../views/primitives/Colors";
import PrivilegeService from "../../service/PrivilegeService";

export class IndividualGeneralHistoryActions {
    static getInitialState() {
        return {
            encounters: [],
            encounterTypes: [],
            displayActionSelector: false,
            encounter: Encounter.create(),
        };
    }

    static onLoad(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individualUUID);
        const privilegeService = context.get(PrivilegeService);
        const encounters = _.map(individual.nonVoidedEncounters(), encounter => ({encounter, expand: false}));
        const newState = IndividualGeneralHistoryActions.clone(state);
        newState.individual = individual;
        newState.encounter = Encounter.create();
        newState.encounter.individual = individual;
        newState.encounterTypes = context.get(FormMappingService)
            .findActiveEncounterTypesForEncounter(individual.subjectType)
            .filter(encounterType => context.get(RuleEvaluationService)
                .isEligibleForEncounter(individual, encounterType));
        newState.displayActionSelector = false;
        const encounterActions = IndividualGeneralHistoryActions.getEncounterActions(newState, privilegeService, action);
        return {
            ...newState,
            programsAvailable: context.get(ProgramService).programsAvailable,
            showCount: SettingsService.IncrementalEncounterDisplayCount,
            encounters,
            encounterActions
        };
    }

    static getEncounterActions(newState, privilegeService, action) {
        const performEncounterCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${newState.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForPerformVisit = privilegeService.allowedEntityTypeUUIDListForCriteria(performEncounterCriteria, 'encounterTypeUuid');
        return newState.encounterTypes.filter((encounterType) => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedEncounterTypeUuidsForPerformVisit, encounterType.uuid)).map(encounterType => {
            newState.encounter.encounterType = encounterType;
            return ({
                fn: () => action.newEncounterCallback(newState.encounter),
                label: encounterType.displayName,
                backgroundColor: Colors.ActionButtonColor
            });
        });
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
    ON_LOAD: "IGHA.ON_LOAD",
    SHOW_MORE: "IGHA.SHOW_MORE",
    ON_TOGGLE: "IGHA.ON_TOGGLE",
    HIDE_ENCOUNTER_SELECTOR: "IGHA.HIDE_ENCOUNTER_SELECTOR",
    LAUNCH_ENCOUNTER_SELECTOR: "IGHA.LAUNCH_ENCOUNTER_SELECTOR",
};

export default new Map([
    [actions.ON_LOAD, IndividualGeneralHistoryActions.onLoad],
    [actions.SHOW_MORE, IndividualGeneralHistoryActions.onShowMore],
    [actions.ON_TOGGLE, IndividualGeneralHistoryActions.onToggle],
    [actions.HIDE_ENCOUNTER_SELECTOR, IndividualGeneralHistoryActions.hideEncounterSelector],
    [actions.LAUNCH_ENCOUNTER_SELECTOR, IndividualGeneralHistoryActions.launchEncounterSelector],
]);

export {actions as Actions};
