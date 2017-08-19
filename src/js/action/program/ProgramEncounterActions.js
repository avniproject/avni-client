import ProgramEncounterState from "./ProgramEncounterState";
import FormMappingService from "../../service/FormMappingService";
import ObservationsHolderActions from '../common/ObservationsHolderActions';
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import _ from 'lodash';
import EntityService from "../../service/EntityService";
import ProgramEncounter from "../../models/ProgramEncounter";
import ConceptService from "../../service/ConceptService";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import ProgramConfigService from "../../service/ProgramConfigService";

class ProgramEncounterActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const form = context.get(FormMappingService).findFormForEncounterType(action.programEncounter.encounterType);
        const observationRules = context.get(ProgramConfigService).observationRulesForProgram(action.programEncounter.programEnrolment.program);
        const isNewEntity = _.isNil(context.get(EntityService).findByUUID(action.programEncounter.uuid, ProgramEncounter.schema.name));
        if (_.isNil(form)) {
            return {error: `No form setup for EncounterType: ${action.programEncounter.encounterType}`};
        }

        return ProgramEncounterState.createOnLoad(action.programEncounter, form, isNewEntity, observationRules);
    }

    static onNext(state, action, context) {
        const programEncounterState = state.clone();
        return programEncounterState.handleNext(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(ConceptService).addDecisions(newState.programEncounter.observations, action.decisions.encounterDecisions);
        const service = context.get(ProgramEncounterService);
        service.saveOrUpdate(newState.programEncounter, action.nextScheduledVisits);

        const enrolment = newState.programEncounter.programEnrolment.cloneForEdit();
        context.get(ConceptService).addDecisions(enrolment.observations, action.decisions.enrolmentDecisions);
        context.get(ProgramEnrolmentService).updateObservations(enrolment);

        action.cb();
        return newState;
    }

    static encounterDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.programEncounter.encounterDateTime = action.value;
        newState.setFilteredFormElements();
        newState.handleValidationResults(newState.programEncounter.validate());
        return newState;
    }
}

const ProgramEncounterActionsNames = {
    ON_LOAD: 'PEncA.ON_LOAD',
    TOGGLE_MULTISELECT_ANSWER: "PEncA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "PEncA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'PEncA.PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'PEncA.PRIMITIVE_VALUE_END_EDITING',
    PREVIOUS: 'PEncA.PREVIOUS',
    NEXT: 'PEncA.NEXT',
    ENCOUNTER_DATE_TIME_CHANGED: "PEncA.ENROLMENT_DATE_TIME_CHANGED",
    SAVE: "PEncA.SAVE",
};

const ProgramEncounterActionsMap = new Map([
    [ProgramEncounterActionsNames.ON_LOAD, ProgramEncounterActions.onLoad],
    [ProgramEncounterActionsNames.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [ProgramEncounterActionsNames.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [ProgramEncounterActionsNames.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [ProgramEncounterActionsNames.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [ProgramEncounterActionsNames.NEXT, ProgramEncounterActions.onNext],
    [ProgramEncounterActionsNames.PREVIOUS, ObservationsHolderActions.onPrevious],
    [ProgramEncounterActionsNames.ENCOUNTER_DATE_TIME_CHANGED, ProgramEncounterActions.encounterDateTimeChanged],
    [ProgramEncounterActionsNames.SAVE, ProgramEncounterActions.onSave]
]);

export {
    ProgramEncounterActionsNames,
    ProgramEncounterActionsMap,
    ProgramEncounterActions
};