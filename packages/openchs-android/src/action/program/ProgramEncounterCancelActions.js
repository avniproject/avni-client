import FormMappingService from "../../service/FormMappingService";
import ObservationsHolderActions from '../common/ObservationsHolderActions';
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import _ from 'lodash';
import ProgramEncounterCancelState from "./ProgramEncounterCancelState";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {ProgramEncounter, Point} from "openchs-models";
import EntityService from "../../service/EntityService";

class ProgramEncounterCancelActions {
    static getInitialState() {
        return {};
    }

    static filterFormElements(formElementGroup, context, programEncounter) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(programEncounter, ProgramEncounter.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onLoad(state, action, context) {
        let programEncounter = context.get(EntityService).findByUUID(action.programEncounter.uuid, ProgramEncounter.schema.name);
        programEncounter = programEncounter.cloneForEdit();
        const form = context.get(FormMappingService).findFormForCancellingEncounterType(programEncounter.encounterType, programEncounter.programEnrolment.program);

        if (_.isNil(form)) {
            throw new Error(`No form setup for EncounterType: ${programEncounter.encounterType}`);
        }

        programEncounter.cancelDateTime = new Date();
        let firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => ProgramEncounterCancelActions.filterFormElements(formElementGroup, context, programEncounter).length !== 0);

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            throw new Error("No form element group with visible form element");
        }
        let filteredElements = ProgramEncounterCancelActions.filterFormElements(firstGroupWithAtLeastOneVisibleElement, context, programEncounter);

        return ProgramEncounterCancelState.createOnLoad(programEncounter, form, firstGroupWithAtLeastOneVisibleElement, filteredElements);
    }

    static onNext(state, action, context) {
        return state.clone().handleNext(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(ProgramEncounterService).saveOrUpdate(newState.programEncounter, action.nextScheduledVisits);

        action.cb();
        return newState;
    }

    static setCancelLocation(state, action) {
        const newState = state.clone();
        const position = action.value;
        newState.programEncounter.cancelLocation = Point.newInstance(position.coords.latitude, position.coords.longitude);
        return newState;
    }
}

const ProgramEncounterCancelActionsNames = {
    ON_LOAD: 'ProgramEncounterCancelActions.ON_LOAD',
    TOGGLE_MULTISELECT_ANSWER: "ProgramEncounterCancelActions.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "ProgramEncounterCancelActions.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'ProgramEncounterCancelActions.PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'ProgramEncounterCancelActions.PRIMITIVE_VALUE_END_EDITING',
    DATE_DURATION_CHANGE: 'ProgramEncounterCancelActions.DATE_DURATION_CHANGE',
    DURATION_CHANGE: 'ProgramEncounterCancelActions.DURATION_CHANGE',
    PREVIOUS: 'ProgramEncounterCancelActions.PREVIOUS',
    NEXT: 'ProgramEncounterCancelActions.NEXT',
    SAVE: "ProgramEncounterCancelActions.SAVE",
    SET_CANCEL_LOCATION: "ProgramEncounterCancelActions.SET_CANCEL_LOCATION",
};

const ProgramEncounterCancelActionsMap = new Map([
    [ProgramEncounterCancelActionsNames.ON_LOAD, ProgramEncounterCancelActions.onLoad],
    [ProgramEncounterCancelActionsNames.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [ProgramEncounterCancelActionsNames.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [ProgramEncounterCancelActionsNames.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [ProgramEncounterCancelActionsNames.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [ProgramEncounterCancelActionsNames.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [ProgramEncounterCancelActionsNames.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [ProgramEncounterCancelActionsNames.NEXT, ProgramEncounterCancelActions.onNext],
    [ProgramEncounterCancelActionsNames.PREVIOUS, ProgramEncounterCancelActions.onPrevious],
    [ProgramEncounterCancelActionsNames.SAVE, ProgramEncounterCancelActions.onSave],
    [ProgramEncounterCancelActionsNames.SET_CANCEL_LOCATION, ProgramEncounterCancelActions.setCancelLocation],
]);

export {
    ProgramEncounterCancelActionsNames,
    ProgramEncounterCancelActionsMap,
    ProgramEncounterCancelActions
};