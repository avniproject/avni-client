import ProgramEnrolmentState from "../../state/ProgramEnrolmentState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import FormMappingService from "../../service/FormMappingService";
import Wizard from "../../state/Wizard";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from "lodash";
import {ObservationsHolder, Point, ProgramEnrolment, StaticFormElementGroup} from "avni-models";
import ConceptService from "../../service/ConceptService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import GeolocationActions from "../common/GeolocationActions";
import IdentifierAssignmentService from "../../service/IdentifierAssignmentService";
import PhoneNumberVerificationActions from "../common/PhoneNumberVerificationActions";
import GroupAffiliationState from "../../state/GroupAffiliationState";
import GroupSubjectService from "../../service/GroupSubjectService";
import GroupAffiliationActions from "../common/GroupAffiliationActions";
import QuickFormEditingActions from "../common/QuickFormEditingActions";
import TimerState from "../../state/TimerState";
import TimerActions from "../common/TimerActions";

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return {};
    }

    static onLoad(state: ProgramEnrolmentState, action, context) {
        if (ProgramEnrolmentState.hasEnrolmentOrItsUsageChanged(state, action) || action.forceLoad) {
            const formMappingService = context.get(FormMappingService);
            const isProgramEnrolment = action.usage === ProgramEnrolmentState.UsageKeys.Enrol;
            const form =
                isProgramEnrolment
                    ? formMappingService.findFormForProgramEnrolment(action.enrolment.program, action.enrolment.individual.subjectType)
                    : formMappingService.findFormForProgramExit(action.enrolment.program, action.enrolment.individual.subjectType);

            //Populate identifiers much before form elements are hidden or sent to rules.
            //This will enable the value to be used in rules
            context.get(IdentifierAssignmentService).populateIdentifiers(form, new ObservationsHolder(action.enrolment.observations));
            const groupAffiliationState = new GroupAffiliationState();
            const enrolmentForm = isProgramEnrolment ? form : formMappingService.findFormForProgramEnrolment(action.enrolment.program, action.enrolment.individual.subjectType);
            context.get(GroupSubjectService).populateGroups(action.enrolment.individual.uuid, enrolmentForm, groupAffiliationState);
            const isNewEnrolment = !context.get(ProgramEnrolmentService).existsByUuid(action.enrolment.uuid);
            const formElementGroup = (_.isNil(form) || _.isNil(form.firstFormElementGroup)) ? new StaticFormElementGroup(form) : form.firstFormElementGroup;
            const numberOfPages = (_.isNil(form) || _.isNil(form.firstFormElementGroup)) ? 1 : form.numberOfPages;
            let formElementStatuses = context
                .get(RuleEvaluationService)
                .getFormElementsStatuses(action.enrolment, ProgramEnrolment.schema.name, formElementGroup);
            let filteredElements = formElementGroup.filterElements(formElementStatuses);
            const timerState = form.timed && isNewEnrolment ? new TimerState(formElementGroup.startTime, formElementGroup.stayTime) : null;
            let programEnrolmentState = new ProgramEnrolmentState(
                [],
                formElementGroup,
                new Wizard(numberOfPages),
                action.usage,
                action.enrolment,
                isNewEnrolment,
                filteredElements,
                action.workLists,
                groupAffiliationState,
                timerState
            );
            programEnrolmentState = programEnrolmentState.clone();
            programEnrolmentState.observationsHolder.updatePrimitiveCodedObs(filteredElements, formElementStatuses);
            if (ObservationsHolderActions.hasQuestionGroupWithValueInElementStatus(formElementStatuses, formElementGroup.getFormElements())) {
                ObservationsHolderActions.updateFormElements(formElementGroup, state, context);
            }
            if (!isProgramEnrolment) {
                programEnrolmentState.groupAffiliation.removeMemberFromGroup();
                GroupAffiliationActions.injectGroupsToIndividual(programEnrolmentState.groupAffiliation, programEnrolmentState);
            }
            return QuickFormEditingActions.moveToPage(programEnrolmentState, action, context, ProgramEnrolmentActions);
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

    static onSummaryPage(state, action, context) {
        return state.clone().handleSummaryPage(action, context);
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
            newState.enrolment = service.enrol(newState.enrolment, action.checklists, action.nextScheduledVisits, action.skipCreatingPendingStatus, newState.groupAffiliation.groupSubjectObservations);
        } else {
            context
                .get(ConceptService)
                .addDecisions(newState.enrolment.programExitObservations, action.decisions.enrolmentDecisions);
            service.exit(newState.enrolment, action.skipCreatingPendingStatus, newState.groupAffiliation.groupSubjectObservations);
        }
        action.cb(newState.enrolment,true);
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
    SUMMARY_PAGE: "PEA.SUMMARY_PAGE",
    PREVIOUS: "PEA.PREVIOUS",
    SAVE: "PEA.SAVE",
    DURATION_CHANGE: "PEA.DURATION_CHANGE",
    DATE_DURATION_CHANGE: "PEA.DATE_DURATION_CHANGE",
    SET_ENROLMENT_LOCATION: "PEA.SET_ENROLMENT_LOCATION",
    SET_EXIT_LOCATION: "PEA.SET_EXIT_LOCATION",
    SET_LOCATION_ERROR: "PEA.SET_LOCATION_ERROR",
    PHONE_NUMBER_CHANGE: "PEA.PHONE_NUMBER_CHANGE",
    GROUP_QUESTION_VALUE_CHANGE: "PEA.GROUP_QUESTION_VALUE_CHANGE",
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: "PEA.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE",
    ON_SUCCESS_OTP_VERIFICATION: "PEA.ON_SUCCESS_OTP_VERIFICATION",
    ON_SKIP_VERIFICATION: "PEA.ON_SKIP_VERIFICATION",
    TOGGLE_GROUPS: "PEA.TOGGLE_GROUPS",
    ON_TIMED_FORM: "PEA.ON_TIMED_FORM",
    ON_START_TIMER: "PEA.ON_START_TIMER",
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
    [actions.SUMMARY_PAGE, ProgramEnrolmentActions.onSummaryPage],
    [actions.PREVIOUS, ProgramEnrolmentActions.onPrevious],
    [actions.SAVE, ProgramEnrolmentActions.onSave],
    [actions.SET_ENROLMENT_LOCATION, ProgramEnrolmentActions.setEnrolmentLocation],
    [actions.SET_EXIT_LOCATION, ProgramEnrolmentActions.setExitLocation],
    [actions.SET_LOCATION_ERROR, GeolocationActions.setLocationError],
    [actions.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [actions.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [actions.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onRepeatableGroupQuestionChange],
    [actions.ON_SUCCESS_OTP_VERIFICATION, PhoneNumberVerificationActions.onSuccessVerification],
    [actions.ON_SKIP_VERIFICATION, PhoneNumberVerificationActions.onSkipVerification],
    [actions.TOGGLE_GROUPS, GroupAffiliationActions.updateValue],
    [actions.ON_TIMED_FORM, TimerActions.onTimedForm],
    [actions.ON_START_TIMER, TimerActions.onStartTimer],
]);

export {actions as Actions};
