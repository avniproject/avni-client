import ProgramEnrolmentState from "./ProgramEnrolmentState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import FormMappingService from "../../service/FormMappingService";
import Wizard from "../../state/Wizard";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from "lodash";
import {StaticFormElementGroup, ProgramEnrolment} from "openchs-models";
import ConceptService from "../../service/ConceptService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Point} from "openchs-models";
import GeolocationActions from "../common/GeolocationActions";

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return {};
    }

    static onLoad(state, action, context) {
        if (ProgramEnrolmentState.hasEnrolmentOrItsUsageChanged(state, action) || action.forceLoad) {
            const formMappingService = context.get(FormMappingService);
            const form =
                action.usage === ProgramEnrolmentState.UsageKeys.Enrol
                    ? formMappingService.findFormForProgramEnrolment(action.enrolment.program)
                    : formMappingService.findFormForProgramExit(action.enrolment.program);
            const isNewEnrolment = _.isNil(action.enrolment.uuid)
                ? true
                : _.isNil(context.get(ProgramEnrolmentService).findByUUID(action.enrolment.uuid));
            const formElementGroup = _.isNil(form) ? new StaticFormElementGroup(form) : form.firstFormElementGroup;
            const numberOfPages = _.isNil(form) ? 1 : form.numberOfPages;
            let formElementStatuses = context
                .get(RuleEvaluationService)
                .getFormElementsStatuses(action.enrolment, ProgramEnrolment.schema.name, formElementGroup);
            let filteredElements = formElementGroup.filterElements(formElementStatuses);
            let programEnrolmentState = new ProgramEnrolmentState(
                [],
                formElementGroup,
                new Wizard(numberOfPages, 1),
                action.usage,
                action.enrolment,
                isNewEnrolment,
                filteredElements
            );
            programEnrolmentState = programEnrolmentState.clone();
            programEnrolmentState.observationsHolder.updatePrimitiveObs(filteredElements, formElementStatuses);
            return programEnrolmentState;
        } else {
            return state.clone();
        }
    }

    static enrolmentDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.enrolment.enrolmentDateTime = action.value;
        newState.handleValidationResults(newState.enrolment.validateEnrolment(), context);
        return newState;
    }

    static setEnrolmentLocation(state, action, context) {
        const newState = state.clone();
        const position = action.value;
        newState.enrolment.enrolmentLocation = Point.newInstance(position.coords.latitude, position.coords.longitude);
        newState.handleValidationResult(
            state.validateLocation(
                newState.enrolment.enrolmentLocation,
                ProgramEnrolment.validationKeys.ENROLMENT_LOCATION,
                context
            )
        );
        return newState;
    }

    static setExitLocation(state, action, context) {
        const newState = state.clone();
        const position = action.value;
        newState.enrolment.exitLocation = Point.newInstance(position.coords.latitude, position.coords.longitude);
        newState.handleValidationResult(
            state.validateLocation(
                newState.enrolment.exitLocation,
                ProgramEnrolment.validationKeys.EXIT_LOCATION,
                context
            )
        );
        return newState;
    }

    static exitDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.enrolment.programExitDateTime = action.value;
        newState.handleValidationResults(newState.enrolment.validateExit(), context);
        return newState;
    }

    static onNext(state, action, context) {
        return state.clone().handleNext(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        const service = context.get(ProgramEnrolmentService);
        if (newState.usage === ProgramEnrolmentState.UsageKeys.Enrol) {
            context
                .get(ConceptService)
                .addDecisions(newState.enrolment.observations, action.decisions.enrolmentDecisions);
            newState.enrolment = service.enrol(newState.enrolment, action.checklists, action.nextScheduledVisits);
        } else {
            context
                .get(ConceptService)
                .addDecisions(newState.enrolment.programExitObservations, action.decisions.enrolmentDecisions);
            service.exit(newState.enrolment);
        }
        action.cb(newState.enrolment);
        return newState;
    }
}

const actions = {
    ON_LOAD: "PEA.ON_LOAD",
    ENROLMENT_DATE_TIME_CHANGED: "PEA.ENROLMENT_DATE_TIME_CHANGED",
    EXIT_DATE_TIME_CHANGED: "PEA.EXIT_DATE_TIME_CHANGED",
    TOGGLE_MULTISELECT_ANSWER: "PEA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "PEA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: "PEA.PRIMITIVE_VALUE_CHANGE",
    PRIMITIVE_VALUE_END_EDITING: "PEA.PRIMITIVE_VALUE_END_EDITING",
    NEXT: "PEA.NEXT",
    PREVIOUS: "PEA.PREVIOUS",
    SAVE: "PEA.SAVE",
    DURATION_CHANGE: "PEA.DURATION_CHANGE",
    DATE_DURATION_CHANGE: "PEA.DATE_DURATION_CHANGE",
    SET_ENROLMENT_LOCATION: "PEA.SET_ENROLMENT_LOCATION",
    SET_EXIT_LOCATION: "PEA.SET_EXIT_LOCATION",
    SET_LOCATION_ERROR: "PEA.SET_LOCATION_ERROR",
};

export default new Map([
    [actions.ON_LOAD, ProgramEnrolmentActions.onLoad],
    [actions.ENROLMENT_DATE_TIME_CHANGED, ProgramEnrolmentActions.enrolmentDateTimeChanged],
    [actions.EXIT_DATE_TIME_CHANGED, ProgramEnrolmentActions.exitDateTimeChanged],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [actions.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [actions.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [actions.NEXT, ProgramEnrolmentActions.onNext],
    [actions.PREVIOUS, ProgramEnrolmentActions.onPrevious],
    [actions.SAVE, ProgramEnrolmentActions.onSave],
    [actions.SET_ENROLMENT_LOCATION, ProgramEnrolmentActions.setEnrolmentLocation],
    [actions.SET_EXIT_LOCATION, ProgramEnrolmentActions.setExitLocation],
    [actions.SET_LOCATION_ERROR, GeolocationActions.setLocationError]
]);

export {actions as Actions};
