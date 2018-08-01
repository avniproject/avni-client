import ProgramEncounterState from "./ProgramEncounterState";
import FormMappingService from "../../service/FormMappingService";
import ObservationsHolderActions from '../common/ObservationsHolderActions';
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import _ from 'lodash';
import EntityService from "../../service/EntityService";
import {ProgramEncounter, Form} from "openchs-models";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import RuleEvaluationService from "../../service/RuleEvaluationService";

class ProgramEncounterActions {
    static getInitialState() {
        return {};
    }

    static filterFormElements(formElementGroup, context, programEncounter) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(programEncounter, ProgramEncounter.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onLoad(state, action, context) {
        const formMapping = context.get(FormMappingService)
            .allFormMappings()
            .forEncounterType(action.programEncounter.encounterType)
            .forProgram(action.programEncounter.programEnrolment.program)
            .forFormType(Form.formTypes.ProgramEncounter)
            .bestMatch();

        const form = formMapping && formMapping.form;

        if (_.isNil(form)) {
            throw new Error(`No form setup for EncounterType: ${action.programEncounter.encounterType}`);
        }

        let firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => ProgramEncounterActions.filterFormElements(formElementGroup, context, action.programEncounter).length !== 0);

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            throw new Error("No form element group with visible form element");
        }

        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(action.programEncounter, ProgramEncounter.schema.name, firstGroupWithAtLeastOneVisibleElement);
        let filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        const isNewEntity = _.isNil(context.get(EntityService).findByUUID(action.programEncounter.uuid, ProgramEncounter.schema.name));
        return ProgramEncounterState.createOnLoad(action.programEncounter, form, isNewEntity, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses);
    }

    static onNext(state, action, context) {
        return state.clone().handleNext(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();

        context.get(ProgramEnrolmentService).updateObservations(newState.programEncounter.programEnrolment);
        const service = context.get(ProgramEncounterService);
        service.saveOrUpdate(newState.programEncounter, action.nextScheduledVisits);

        action.cb();
        return newState;
    }

    static encounterDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.programEncounter.encounterDateTime = action.value;
        newState.handleValidationResults(newState.programEncounter.validate());
        const formElementStatuses = ObservationsHolderActions.updateFormElements(newState.formElementGroup, newState, context);
        newState.observationsHolder.removeNonApplicableObs(newState.formElementGroup.getFormElements(), newState.filteredFormElements);
        newState.observationsHolder.updatePrimitiveObs(newState.filteredFormElements, formElementStatuses);
        return newState;
    }
}

const ProgramEncounterActionsNames = {
    ON_LOAD: 'PEncA.ON_LOAD',
    TOGGLE_MULTISELECT_ANSWER: "PEncA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "PEncA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'PEncA.PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'PEncA.PRIMITIVE_VALUE_END_EDITING',
    DURATION_CHANGE: 'PEncA.DURATION_CHANGE',
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
    [ProgramEncounterActionsNames.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [ProgramEncounterActionsNames.NEXT, ProgramEncounterActions.onNext],
    [ProgramEncounterActionsNames.PREVIOUS, ProgramEncounterActions.onPrevious],
    [ProgramEncounterActionsNames.ENCOUNTER_DATE_TIME_CHANGED, ProgramEncounterActions.encounterDateTimeChanged],
    [ProgramEncounterActionsNames.SAVE, ProgramEncounterActions.onSave]
]);

export {
    ProgramEncounterActionsNames,
    ProgramEncounterActionsMap,
    ProgramEncounterActions
};