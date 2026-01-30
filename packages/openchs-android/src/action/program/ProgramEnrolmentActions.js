import ProgramEnrolmentState from "../../state/ProgramEnrolmentState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import FormMappingService from "../../service/FormMappingService";
import Wizard from "../../state/Wizard";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from "lodash";
import {DraftEnrolment, ObservationsHolder, Point, ProgramEnrolment, StaticFormElementGroup} from "avni-models";
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
import IndividualService from "../../service/IndividualService";
import DraftEnrolmentService from "../../service/draft/DraftEnrolmentService";
import DraftConfigService from "../../service/DraftConfigService";

export class ProgramEnrolmentActions {
    static getInitialState(context) {
        return new ProgramEnrolmentState();
    }

    static onLoad(state: ProgramEnrolmentState, action, context) {
            const enrolment = action.enrolment.cloneForEdit();
            const formMappingService = context.get(FormMappingService);
            const isProgramEnrolment = action.usage === ProgramEnrolmentState.UsageKeys.Enrol;
            const form =
                isProgramEnrolment
                    ? formMappingService.findFormForProgramEnrolment(enrolment.program, enrolment.individual.subjectType)
                    : formMappingService.findFormForProgramExit(enrolment.program, enrolment.individual.subjectType);

            // Check for existing draft and restore if found (only for enrolment, not exit) - lookup by individual+program
            const draftConfigService = context.get(DraftConfigService);
            const draftEnrolment = isProgramEnrolment && draftConfigService.shouldLoadDraft()
                ? context.get(DraftEnrolmentService).findByIndividualAndProgram(action.enrolment.individual, action.enrolment.program)
                : null;
            const isDraft = !!draftEnrolment;
            let editableEnrolment = enrolment;
            if (draftEnrolment) {
                editableEnrolment = draftEnrolment.constructEnrolment();
                editableEnrolment.individual = enrolment.individual; // Keep current individual reference
                editableEnrolment.program = enrolment.program; // Keep current program reference
            }

            //Populate identifiers much before form elements are hidden or sent to rules.
            //This will enable the value to be used in rules
            context.get(IdentifierAssignmentService).populateIdentifiers(form, new ObservationsHolder(editableEnrolment.observations));
            const groupAffiliationState = new GroupAffiliationState();
            const enrolmentForm = isProgramEnrolment ? form : formMappingService.findFormForProgramEnrolment(editableEnrolment.program, editableEnrolment.individual.subjectType);
            context.get(GroupSubjectService).populateGroups(editableEnrolment.individual.uuid, enrolmentForm, groupAffiliationState);
            const isNewEnrolment = !context.get(ProgramEnrolmentService).existsByUuid(editableEnrolment.uuid);
            const isFirstFlow = isNewEnrolment || !action.editing;
            const saveDrafts = isProgramEnrolment && draftConfigService.shouldSaveDraft(isFirstFlow, isDraft);
            const formElementGroup = (_.isNil(form) || _.isNil(form.firstFormElementGroup)) ? new StaticFormElementGroup(form) : form.firstFormElementGroup;
            const numberOfPages = (_.isNil(form) || _.isNil(form.firstFormElementGroup)) ? 1 : form.numberOfPages;
            let formElementStatuses = context
                .get(RuleEvaluationService)
                .getFormElementsStatuses(editableEnrolment, ProgramEnrolment.schema.name, formElementGroup);
            let filteredElements = formElementGroup.filterElements(formElementStatuses);
            // Timer is not initialized for draft flows
            const timerState = formElementGroup.timed && isFirstFlow && !isDraft ? new TimerState(formElementGroup.startTime, formElementGroup.stayTime) : null;
            let programEnrolmentState = new ProgramEnrolmentState(
                [],
                formElementGroup,
                new Wizard(numberOfPages),
                action.usage,
                editableEnrolment,
                isNewEnrolment,
                filteredElements,
                action.workLists,
                groupAffiliationState,
                timerState,
                isFirstFlow,
                isDraft,
                saveDrafts
            );
            programEnrolmentState = programEnrolmentState.clone();
            programEnrolmentState.observationsHolder.updatePrimitiveCodedObs(filteredElements, formElementStatuses);
            if (ObservationsHolderActions.hasQuestionGroupWithValueInElementStatus(formElementStatuses, formElementGroup.getFormElements())) {
                ObservationsHolderActions.updateFormElements(formElementGroup, state, context);
            }
            if (!isProgramEnrolment) {
                programEnrolmentState.groupAffiliation.removeMemberFromGroup();
            }
            return QuickFormEditingActions.moveToPage(programEnrolmentState, action, context, ProgramEnrolmentActions);
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

    static saveDraftEnrolment(enrolment, validationResults, context) {
        if (_.isEmpty(validationResults)) {
            context.get(DraftEnrolmentService).saveDraft(enrolment);
        }
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        newState.handleNext(action, context);
        if (state.saveDrafts && state.usage === ProgramEnrolmentState.UsageKeys.Enrol) {
            ProgramEnrolmentActions.saveDraftEnrolment(newState.enrolment, newState.validationResults, context);
        }
        return newState;
    }

    static onSummaryPage(state, action, context) {
        return state.clone().handleSummaryPage(action, context);
    }

    static onPrevious(state, action, context) {
        const newState = state.clone().handlePrevious(action, context);
        if (state.saveDrafts && state.usage === ProgramEnrolmentState.UsageKeys.Enrol) {
            ProgramEnrolmentActions.saveDraftEnrolment(newState.enrolment, newState.validationResults, context);
        }
        return newState;
    }

    static onBack(state, action, context) {
        if (state.saveDrafts && state.usage === ProgramEnrolmentState.UsageKeys.Enrol) {
            ProgramEnrolmentActions.saveDraftEnrolment(state.enrolment, [], context);
        }
        return state;
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(IndividualService).updateObservations(newState.enrolment.individual);
        const service = context.get(ProgramEnrolmentService);
        if (newState.usage === ProgramEnrolmentState.UsageKeys.Enrol) {
            context
                .get(ConceptService)
                .addDecisions(newState.enrolment.observations, action.decisions.enrolmentDecisions);
            newState.enrolment = service.enrol(newState.enrolment, action.checklists, action.nextScheduledVisits, action.skipCreatingPendingStatus, newState.groupAffiliation.groupSubjectObservations);
            // Delete draft after successful enrolment
            context.get(DraftEnrolmentService).deleteDraftByUUID(newState.enrolment.uuid);
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
    ON_BACK: "PEA.ON_BACK",
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
    [actions.ON_BACK, ProgramEnrolmentActions.onBack],
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
