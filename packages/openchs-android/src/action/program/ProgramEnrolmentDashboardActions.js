import EntityService from "../../service/EntityService";
import {
    Encounter,
    NullProgramEnrolment,
    ProgramEncounter,
    ProgramEnrolment,
    WorkLists,
    WorkList,
    WorkItem, ObservationsHolder
} from 'avni-models';
import _ from 'lodash';
import EntityTypeChoiceState from "../common/EntityTypeChoiceState";
import FormMappingService from "../../service/FormMappingService";
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import EntityTypeChoiceActionNames from "../common/EntityTypeChoiceActionNames";
import General from "../../utility/General";
import ProgramConfigService from "../../service/ProgramConfigService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import ProgramService from "../../service/program/ProgramService";
import SettingsService from "../../service/SettingsService";
import UserInfoService from "../../service/UserInfoService";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import IndividualService from "../../service/IndividualService";

class ProgramEnrolmentDashboardActions {
    static setEncounterType(encounterType) {
        this.entity.encounterType = encounterType;
    }

    static cloneEntity(entity) {
        if (!_.isNil(entity))
            return entity.cloneForEdit();
    }

    static getInitialState() {
        return {
            programEncounterTypeState: new EntityTypeChoiceState(ProgramEncounter.createEmptyInstance(), ProgramEnrolmentDashboardActions.setEncounterType, ProgramEnrolmentDashboardActions.cloneEntity),
            enrolment: ProgramEnrolment.createEmptyInstance(),
            encounter: Encounter.create(),
            encounterTypes: [],
            displayActionSelector: false,
            expandEnrolmentInfo: false,
            completedEncounters: []
        };
    }

    static _setEncounterTypeState(newState, context) {
        const enrolment = newState.enrolment;
        const individual = enrolment.individual;
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = enrolment;
        const programEncounterTypes = context.get(FormMappingService)
            .findEncounterTypesForProgram(enrolment.program, individual.subjectType);
        newState.programEncounterTypeState.entityParentSelected(programEncounterTypes, programEncounter);

        newState.encounter.individual = individual;
        newState.encounterTypes = context.get(FormMappingService)
            .findEncounterTypesForEncounter(individual.subjectType)
            .filter(encounterType => context.get(RuleEvaluationService)
                .isEligibleForEncounter(individual, encounterType));
        newState.completedEncounters = _.filter(enrolment.nonVoidedEncounters(), (encounter) => encounter.encounterDateTime || encounter.cancelDateTime)
            .map(encounter => ({encounter, expand: false}));
        return newState;
    }

    static launchEncounterSelector(state) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.displayActionSelector = true;
        return newState;
    }

    static hideEncounterSelector(state) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.displayActionSelector = false;
        return newState;
    }

    static clone(state) {
        return {
            programEncounterTypeState: state.programEncounterTypeState.clone(),
            enrolment: state.enrolment,
            encounter: state.encounter.cloneForEdit(),
            encounterTypes: state.encounterTypes.slice(),
            displayActionSelector: state.displayActionSelector,
            programsAvailable: state.programsAvailable,
            showCount: state.showCount,
            dashboardButtons: state.dashboardButtons,
            enrolmentSummary: state.enrolmentSummary,
            hideExit: state.hideExit,
            hideEnrol: state.hideEnrol,
            expandEnrolmentInfo: state.expandEnrolmentInfo,
            completedEncounters: state.completedEncounters,
        };
    }

    static onLoad(state, action, context) {
        const {enrolmentUUID, individualUUID} = action;
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        ProgramEnrolmentDashboardActions._updateStateWithBackFunction(action, newState, state);
        newState.programsAvailable = context.get(ProgramService).programsAvailable;
        //TODO This hiding buttons this way is a temporary fix to avoid flood of issues from DDM.
        // TODO Proper solution will roles and privilege based
        newState.hideExit = context.get(UserInfoService).getUserSettings().hideExit;
        newState.hideEnrol = context.get(UserInfoService).getUserSettings().hideEnrol;
        const enrolment = ProgramEnrolmentDashboardActions._getEnrolment(newState, context, individualUUID, enrolmentUUID);
        newState.completedEncounters = _.filter(enrolment.nonVoidedEncounters(), (encounter) => encounter.encounterDateTime || encounter.cancelDateTime)
            .map(encounter => ({encounter, expand: false}));
        return ProgramEnrolmentDashboardActions._onEnrolmentChange(newState, context, enrolment);
    }

    static _updateStateWithBackFunction(action, newState, state) {
        if (!_.isNil(action.backFunction)) {
            newState.backFunction = action.backFunction;
        } else if (!_.isNil(state.backFunction)) {
            newState.backFunction = state.backFunction;
        }
    }

//Program Encounter Type
    static launchChooseProgramEncounterType(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.programEncounterTypeState.launchChooseEntityType();
        return newState;
    }

    static onShowMore(state) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.showCount = state.showCount + SettingsService.IncrementalEncounterDisplayCount;
        return newState;
    }

    static onProgramEncounterTypeSelected(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.programEncounterTypeState.selectedEntityType(action.value);
        return newState;
    }

    static onCancelledProgramEncounterTypeSelection(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.programEncounterTypeState.cancelledEntityTypeSelection(action.value);
        return newState;
    }

    static onProgramEncounterTypeConfirmed(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);

        if (!newState.programEncounterTypeState.entity.encounterType) return newState;
        const encounterTypeUUID = newState.programEncounterTypeState.entity.encounterType.uuid;
        const enrolmentUUID = newState.enrolment.uuid;
        const dueEncounter = context.get(ProgramEncounterService).findDueEncounter({encounterTypeUUID, enrolmentUUID});
        if (!_.isNil(dueEncounter)) {
            General.logInfo('ProgramEnrolmentDashboardActions', 'Found a due encounter');
            newState.programEncounterTypeState.overwriteEntity(dueEncounter);
        }
        newState.programEncounterTypeState.entityTypeSelectionConfirmed(action);
        return newState;
    }

    //Program Encounter Type

    //Encounter Type
    static launchChooseEncounterType(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.encounterTypeState.launchChooseEntityType();
        return newState;
    }

    static onEncounterTypeSelected(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.encounterTypeState.selectedEntityType(action.value);
        return newState;
    }

    static onCancelledEncounterTypeSelection(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.encounterTypeState.cancelledEntityTypeSelection(action.value);
        return newState;
    }

    static onEncounterTypeConfirmed(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.encounterTypeState.entityTypeSelectionConfirmed(action);
        return newState;
    }

    //Encounter Type

    static onEditEnrolment(state, action, context) {
        const enrolment = context.get(EntityService).findByUUID(state.enrolment.uuid, ProgramEnrolment.schema.name);
        let workLists = new WorkLists(
            new WorkList('Enrolment',
                [new WorkItem(General.randomUUID(),
                    WorkItem.type.PROGRAM_ENROLMENT,
                    {
                        subjectUUID: enrolment.individual.uuid,
                        programName: enrolment.program.name,
                    })
                ]));
        action.cb(enrolment, workLists);
        return state;
    }

    static onEditEnrolmentExit(state, action, context) {
        const enrolment = context.get(EntityService).findByUUID(state.enrolment.uuid, ProgramEnrolment.schema.name);
        const workLists = new WorkLists(
            new WorkList('Exit',
                [new WorkItem(General.randomUUID(),
                    WorkItem.type.PROGRAM_ENROLMENT,
                    {
                        subjectUUID: enrolment.individual.uuid,
                        programName: enrolment.program.name,
                    })
                ]));
        action.cb(enrolment, workLists);
        return state;
    }

    static onExitEnrolment(state, action, context) {
        const enrolment = state.enrolment.cloneForEdit();
        enrolment.programExitDateTime = new Date();
        const workLists = new WorkLists(
            new WorkList('Exit',
                [new WorkItem(General.randomUUID(),
                    WorkItem.type.PROGRAM_EXIT,
                    {
                        subjectUUID: enrolment.individual.uuid,
                        programName: enrolment.program.name,
                    })
                ]));
        action.cb(enrolment, workLists);
        return state;
    }

    static _addProgramConfig(program, context) {
        let programConfig = context.get(ProgramConfigService);
        return programConfig.findDashboardButtons(program) || [];
    }

    static onEnrolmentChange(state, action, context) {
        if (action.enrolmentUUID === state.enrolment.uuid) return state;
        const enrolment = state.enrolment.individual.findEnrolment(action.enrolmentUUID);
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        return ProgramEnrolmentDashboardActions._onEnrolmentChange(newState, context, enrolment);
    }

    static onFocus(state, {individualUUID, enrolmentUUID}, context) {
        const enrolment = ProgramEnrolmentDashboardActions._getEnrolment(state, context, individualUUID, enrolmentUUID);
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        return ProgramEnrolmentDashboardActions._onEnrolmentChange(newState, context, enrolment);
    }

    static _onEnrolmentChange(newState, context, enrolment) {
        const ruleService = context.get(RuleEvaluationService);
        newState.enrolment = enrolment;
        newState.enrolmentSummary = ruleService.getEnrolmentSummary(newState.enrolment, ProgramEnrolment.schema.name, context);
        newState.dashboardButtons = ProgramEnrolmentDashboardActions._addProgramConfig(newState.enrolment.program, context);
        newState.showCount = SettingsService.IncrementalEncounterDisplayCount;

        return ProgramEnrolmentDashboardActions._setEncounterTypeState(newState, context);
    }

    static onEnrolmentToggle(state) {
        return {...state, expandEnrolmentInfo: !state.expandEnrolmentInfo}
    }

    static onEncounterToggle(state, action) {
        const nonEqual = _.filter(state.completedEncounters, (e) => !_.isEqualWith(e, action.encounterInfo, (e1, e2) => e1.encounter.uuid === e2.encounter.uuid));
        const completedEncounters = [...nonEqual, action.encounterInfo];
        return {...state, completedEncounters};
    }

    static _getEnrolment(state, context, individualUUID, enrolmentUUID) {
        const enrolmentService = context.get(ProgramEnrolmentService);
        if (enrolmentService.existsByUuid(enrolmentUUID)) {
            return enrolmentService.findByUUID(enrolmentUUID);
        }
        if (state.enrolment.individual.uuid === individualUUID && enrolmentService.existsByUuid(state.enrolment.uuid)) {
            return enrolmentService.findByUUID(state.enrolment.uuid);
        }
        const individual = context.get(IndividualService).findByUUID(individualUUID);
        return individual.firstActiveOrRecentEnrolment || new NullProgramEnrolment(individual);
    }

    static onProgramReJoin(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        const programEnrolment = context.get(EntityService).findByUUID(state.enrolment.uuid, ProgramEnrolment.schema.name);
        const newProgramEnrolmentWithExitRemoved = ProgramEnrolmentDashboardActions.cloneEnrolmentForRejoin(programEnrolment);
        context.get(ProgramEnrolmentService).reJoinProgram(newProgramEnrolmentWithExitRemoved);
        newState.enrolment = newProgramEnrolmentWithExitRemoved;
        return newState;
    }

    static cloneEnrolmentForRejoin(programEnrolment) {
        const newProgramEnrolment = programEnrolment.cloneForEdit();
        newProgramEnrolment.programExitDateTime = null;
        newProgramEnrolment.programExitObservations = [];
        newProgramEnrolment.exitLocation = null;
        return newProgramEnrolment;
    }

    static ACTION_PREFIX = 'PEDA';
}

const ProgramEnrolmentDashboardActionsNames = {
    ON_LOAD: 'PEDA.ON_LOAD',
    ON_FOCUS: 'PEDA.ON_FOCUS',
    ON_EDIT_ENROLMENT: 'PEDA.ON_EDIT_ENROLMENT',
    ON_EDIT_ENROLMENT_EXIT: 'PEDA.ON_EDIT_ENROLMENT_EXIT',
    ON_EXIT_ENROLMENT: 'PEDA.ON_EXIT_ENROLMENT',
    ON_ENROLMENT_CHANGE: 'PEDA.ON_ENROLMENT_CHANGE',
    RESET: 'PEDA.RESET',
    SHOW_MORE: 'PEDA.SHOW_MORE',
    LAUNCH_ENCOUNTER_SELECTOR: "PEDA.LAUNCH_ENCOUNTER_SELECTOR",
    HIDE_ENCOUNTER_SELECTOR: "PEDA.HIDE_ENCOUNTER_SELECTOR",
    ON_ENROLMENT_TOGGLE: "PEDA.ON_ENROLMENT_TOGGLE",
    ON_ENCOUNTER_TOGGLE: "PEDA.ON_Encounter_TOGGLE",
    ON_PROGRAM_REJOIN: "PEDA.ON_PROGRAM_REJOIN"
};

const ProgramEncounterTypeChoiceActionNames = new EntityTypeChoiceActionNames('PEDA');
const EncounterTypeChoiceActionNames = new EntityTypeChoiceActionNames('ENCOUNTER');

const ProgramEnrolmentDashboardActionsMap = new Map([
    [ProgramEnrolmentDashboardActionsNames.ON_LOAD, ProgramEnrolmentDashboardActions.onLoad],
    [ProgramEnrolmentDashboardActionsNames.ON_FOCUS, ProgramEnrolmentDashboardActions.onFocus],
    [ProgramEnrolmentDashboardActionsNames.RESET, ProgramEnrolmentDashboardActions.getInitialState],
    [ProgramEnrolmentDashboardActionsNames.SHOW_MORE, ProgramEnrolmentDashboardActions.onShowMore],
    [ProgramEnrolmentDashboardActionsNames.ON_EDIT_ENROLMENT, ProgramEnrolmentDashboardActions.onEditEnrolment],
    [ProgramEnrolmentDashboardActionsNames.ON_EXIT_ENROLMENT, ProgramEnrolmentDashboardActions.onExitEnrolment],
    [ProgramEnrolmentDashboardActionsNames.ON_EDIT_ENROLMENT_EXIT, ProgramEnrolmentDashboardActions.onEditEnrolmentExit],
    [ProgramEnrolmentDashboardActionsNames.ON_ENROLMENT_CHANGE, ProgramEnrolmentDashboardActions.onEnrolmentChange],
    [ProgramEnrolmentDashboardActionsNames.LAUNCH_ENCOUNTER_SELECTOR, ProgramEnrolmentDashboardActions.launchEncounterSelector],
    [ProgramEnrolmentDashboardActionsNames.HIDE_ENCOUNTER_SELECTOR, ProgramEnrolmentDashboardActions.hideEncounterSelector],
    [ProgramEnrolmentDashboardActionsNames.ON_ENROLMENT_TOGGLE, ProgramEnrolmentDashboardActions.onEnrolmentToggle],
    [ProgramEnrolmentDashboardActionsNames.ON_ENCOUNTER_TOGGLE, ProgramEnrolmentDashboardActions.onEncounterToggle],
    [ProgramEnrolmentDashboardActionsNames.ON_PROGRAM_REJOIN, ProgramEnrolmentDashboardActions.onProgramReJoin],

    [ProgramEncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE, ProgramEnrolmentDashboardActions.launchChooseProgramEncounterType],
    [ProgramEncounterTypeChoiceActionNames.ENTITY_TYPE_SELECTED, ProgramEnrolmentDashboardActions.onProgramEncounterTypeSelected],
    [ProgramEncounterTypeChoiceActionNames.CANCELLED_ENTITY_TYPE_SELECTION, ProgramEnrolmentDashboardActions.onCancelledProgramEncounterTypeSelection],
    [ProgramEncounterTypeChoiceActionNames.ENTITY_TYPE_SELECTION_CONFIRMED, ProgramEnrolmentDashboardActions.onProgramEncounterTypeConfirmed],

    [EncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE, ProgramEnrolmentDashboardActions.launchChooseEncounterType],
    [EncounterTypeChoiceActionNames.ENTITY_TYPE_SELECTED, ProgramEnrolmentDashboardActions.onEncounterTypeSelected],
    [EncounterTypeChoiceActionNames.CANCELLED_ENTITY_TYPE_SELECTION, ProgramEnrolmentDashboardActions.onCancelledEncounterTypeSelection],
    [EncounterTypeChoiceActionNames.ENTITY_TYPE_SELECTION_CONFIRMED, ProgramEnrolmentDashboardActions.onEncounterTypeConfirmed]
]);

export {
    ProgramEnrolmentDashboardActionsNames,
    ProgramEnrolmentDashboardActionsMap,
    ProgramEnrolmentDashboardActions,
    ProgramEncounterTypeChoiceActionNames,
    EncounterTypeChoiceActionNames
};
