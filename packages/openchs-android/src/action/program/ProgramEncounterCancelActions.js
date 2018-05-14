import FormMappingService from "../../service/FormMappingService";
import ObservationsHolderActions from '../common/ObservationsHolderActions';
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import _ from 'lodash';
import ProgramEncounterCancelState from "./ProgramEncounterCancelState";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {ProgramEncounter} from "openchs-models";

class ProgramEncounterCancelActions {
    static getInitialState() {
        return {};
    }

    static filterFormElements(formElementGroup, context, programEncounter) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(programEncounter, ProgramEncounter.schema.name, formElementGroup);
        let filteredElements = formElementGroup.filterElements(formElementStatuses);
        return filteredElements;
    };

    static onLoad(state, action, context) {
        const form = context.get(FormMappingService).findFormForCancellingEncounterType(action.programEncounter.encounterType, action.programEncounter.programEnrolment.program);

        if (_.isNil(form)) {
            throw new Error(`No form setup for EncounterType: ${action.programEncounter.encounterType}`);
        }
        const programEncounter = action.programEncounter.cloneForEdit();
        programEncounter.cancelDateTime = new Date();

        let firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function(o){return o.displayOrder}]), (formElementGroup) => ProgramEncounterCancelActions.filterFormElements(formElementGroup, context, action.programEncounter).length != 0);

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            throw new Error("No form element group with visible form element");
        }
        let filteredElements = ProgramEncounterCancelActions.filterFormElements(firstGroupWithAtLeastOneVisibleElement, context, action.programEncounter);

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
        context.get(ProgramEncounterService).saveOrUpdate(newState.programEncounter, []);

        action.cb();
        return newState;
    }
}

const ProgramEncounterCancelActionsNames = {
    ON_LOAD: 'ProgramEncounterCancelActions.ON_LOAD',
    TOGGLE_MULTISELECT_ANSWER: "ProgramEncounterCancelActions.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "ProgramEncounterCancelActions.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'ProgramEncounterCancelActions.PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'ProgramEncounterCancelActions.PRIMITIVE_VALUE_END_EDITING',
    DURATION_CHANGE: 'ProgramEncounterCancelActions.DURATION_CHANGE',
    PREVIOUS: 'ProgramEncounterCancelActions.PREVIOUS',
    NEXT: 'ProgramEncounterCancelActions.NEXT',
    SAVE: "ProgramEncounterCancelActions.SAVE",
};

const ProgramEncounterCancelActionsMap = new Map([
    [ProgramEncounterCancelActionsNames.ON_LOAD, ProgramEncounterCancelActions.onLoad],
    [ProgramEncounterCancelActionsNames.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [ProgramEncounterCancelActionsNames.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [ProgramEncounterCancelActionsNames.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [ProgramEncounterCancelActionsNames.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [ProgramEncounterCancelActionsNames.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [ProgramEncounterCancelActionsNames.NEXT, ProgramEncounterCancelActions.onNext],
    [ProgramEncounterCancelActionsNames.PREVIOUS, ProgramEncounterCancelActions.onPrevious],
    [ProgramEncounterCancelActionsNames.SAVE, ProgramEncounterCancelActions.onSave]
]);

export {
    ProgramEncounterCancelActionsNames,
    ProgramEncounterCancelActionsMap,
    ProgramEncounterCancelActions
};