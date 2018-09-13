import EntityService from "../../service/EntityService";
import {ProgramEnrolment, ProgramEncounter, Encounter, NullProgramEnrolment, Individual} from 'openchs-models';
import _ from 'lodash';
import EntityTypeChoiceState from "../common/EntityTypeChoiceState";
import FormMappingService from "../../service/FormMappingService";
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import EntityTypeChoiceActionNames from "../common/EntityTypeChoiceActionNames";
import General from "../../utility/General";
import ProgramConfigService from "../../service/ProgramConfigService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Program} from 'openchs-models';
import ProgramService from "../../service/program/ProgramService";

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
            encounterTypeState: new EntityTypeChoiceState(Encounter.create(), ProgramEnrolmentDashboardActions.setEncounterType, ProgramEnrolmentDashboardActions.cloneEntity),
            enrolment: ProgramEnrolment.createEmptyInstance()
        };
    }

    static _setEncounterTypeState(newState, context) {
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = newState.enrolment;
        const programEncounterTypes = context.get(FormMappingService).findEncounterTypesForProgram(newState.enrolment.program);
        newState.programEncounterTypeState.entityParentSelected(programEncounterTypes, programEncounter);

        const encounter = Encounter.create();
        encounter.individual = newState.enrolment.individual;
        const encounterTypes = context.get(FormMappingService).findEncounterTypesForEncounter();
        newState.encounterTypeState.entityParentSelected(encounterTypes, encounter);
        return newState;
    }

    static clone(state) {
        return {
            programEncounterTypeState: state.programEncounterTypeState.clone(),
            encounterTypeState: state.encounterTypeState.clone(),
            enrolment: state.enrolment,
            programsAvailable: state.programsAvailable
        };
    }

    static onLoad(state, action, context) {
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        ProgramEnrolmentDashboardActions._updateStateWithBackFunction(action, newState, state);
        const entityService = context.get(EntityService);
        const ruleService = context.get(RuleEvaluationService);
        if (_.isNil(action.enrolmentUUID)) {
            const individual = entityService.findByUUID(action.individualUUID, Individual.schema.name);
            newState.enrolment = individual.enrolments.length === 0 ? new NullProgramEnrolment(individual) : individual.firstActiveOrRecentEnrolment;
            newState.dashboardButtons = ProgramEnrolmentDashboardActions._addProgramConfig(newState.enrolment.program, context);
        } else {
            newState.enrolment = entityService.findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
            newState.dashboardButtons = ProgramEnrolmentDashboardActions._addProgramConfig(newState.enrolment.program, context);
        }
        newState.enrolmentSummary = ruleService.getEnrolmentSummary(newState.enrolment, ProgramEnrolment.schema.name, {});
        newState.programsAvailable = context.get(ProgramService).programsAvailable;

        return ProgramEnrolmentDashboardActions._setEncounterTypeState(newState, context);
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

        const dueEncounter = context.get(ProgramEncounterService).findDueEncounter(newState.programEncounterTypeState.entity.encounterType.uuid, newState.enrolment.uuid);
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
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
        action.cb(enrolment);
        return state;
    }

    static _addProgramConfig(program, context) {
        let programConfig = context.get(ProgramConfigService);
        return programConfig.findDashboardButtons(program) || [];
    }

    static onProgramChange(state, action, context) {
        if (action.program.uuid === state.enrolment.program.uuid) return state;

        const ruleService = context.get(RuleEvaluationService);
        const newState = ProgramEnrolmentDashboardActions.clone(state);
        newState.enrolment = state.enrolment.individual.findEnrolmentForProgram(action.program);
        newState.enrolmentSummary = ruleService.getEnrolmentSummary(newState.enrolment, ProgramEnrolment.schema.name, {});
        newState.dashboardButtons = ProgramEnrolmentDashboardActions._addProgramConfig(action.program, context);

        return ProgramEnrolmentDashboardActions._setEncounterTypeState(newState, context);
    }

    static ACTION_PREFIX = 'PEDA';
}

const ProgramEnrolmentDashboardActionsNames = {
    ON_LOAD: 'PEDA.ON_LOAD',
    ON_EDIT_ENROLMENT: 'PEDA.ON_EDIT_ENROLMENT',
    ON_PROGRAM_CHANGE: 'PEDA.ON_PROGRAM_CHANGE',
    RESET: 'PEDA.RESET'
};

const ProgramEncounterTypeChoiceActionNames = new EntityTypeChoiceActionNames('PEDA');
const EncounterTypeChoiceActionNames = new EntityTypeChoiceActionNames('ENCOUNTER');

const ProgramEnrolmentDashboardActionsMap = new Map([
    [ProgramEnrolmentDashboardActionsNames.ON_LOAD, ProgramEnrolmentDashboardActions.onLoad],
    [ProgramEnrolmentDashboardActionsNames.RESET, ProgramEnrolmentDashboardActions.getInitialState],
    [ProgramEnrolmentDashboardActionsNames.ON_EDIT_ENROLMENT, ProgramEnrolmentDashboardActions.onEditEnrolment],
    [ProgramEnrolmentDashboardActionsNames.ON_PROGRAM_CHANGE, ProgramEnrolmentDashboardActions.onProgramChange],

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