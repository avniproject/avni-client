import ProgramEncounterState from "../../state/ProgramEncounterState";
import FormMappingService from "../../service/FormMappingService";
import ObservationsHolderActions from '../common/ObservationsHolderActions';
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import _ from 'lodash';
import EntityService from "../../service/EntityService";
import {Point, ProgramEncounter, WorkList, WorkLists} from "avni-models";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import GeolocationActions from "../common/GeolocationActions";
import General from "../../utility/General";
import PhoneNumberVerificationActions from "../common/PhoneNumberVerificationActions";
import QuickFormEditingActions from "../common/QuickFormEditingActions";

class ProgramEncounterActions {
    static getInitialState() {
        return {
            messageDisplayed: true
        };
    }

    static filterFormElements(formElementGroup, context, programEncounter) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(programEncounter, ProgramEncounter.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onLoad(state, action, context) {
        const formMapping = context.get(FormMappingService).getProgramEncounterFormMapping(
            action.programEncounter.encounterType,
            action.programEncounter.programEnrolment.program,
            action.programEncounter.programEnrolment.individual.subjectType);

        const form = formMapping && formMapping.form;

        if (_.isNil(form)) {
            throw new Error(`No form setup for EncounterType: ${action.programEncounter.encounterType.name}`);
        }

        let firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => ProgramEncounterActions.filterFormElements(formElementGroup, context, action.programEncounter).length !== 0);

        const isNewEntity = _.isNil(context.get(EntityService).findByUUID(action.programEncounter.uuid, ProgramEncounter.schema.name));
        const workLists = action.workLists || new WorkLists(new WorkList('Enrolment').withEncounter({
            encounterType: action.programEncounter.encounterType.name,
            subjectUUID: action.programEncounter.programEnrolment.individual.uuid,
            programName: action.programEncounter.programEnrolment.program.name,
        }));

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return ProgramEncounterState.createOnLoadStateForEmptyForm(action.programEncounter, form, isNewEntity, workLists);
        }

        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(action.programEncounter, ProgramEncounter.schema.name, firstGroupWithAtLeastOneVisibleElement);
        let filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        const newState = ProgramEncounterState.createOnLoad(action.programEncounter, form, isNewEntity, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses, workLists);
        return QuickFormEditingActions.moveToPage(newState, action, context, ProgramEncounterActions);
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

    static setEncounterLocation(state, action, context) {
        const newState = state.clone();
        const position = action.value;
        newState.programEncounter.encounterLocation = Point.newInstance(position.coords.latitude, position.coords.longitude);
        newState.handleValidationResult(
            state.validateLocation(
                newState.programEncounter.encounterLocation,
                ProgramEncounter.validationKeys.ENCOUNTER_LOCATION,
                context
            )
        );
        return newState;
    }

    static onSave(state, action, context) {
        const newState = state.clone();

        context.get(ProgramEnrolmentService).updateObservations(newState.programEncounter.programEnrolment);
        const service = context.get(ProgramEncounterService);

        const scheduledVisits = [];
        const existingScheduledVisitsForSameEncounter = newState.programEncounter.getAllScheduledVisits();

        action.nextScheduledVisits.forEach(nextVisit => {
            const existingScheduleVisits = nextVisit.programEnrolment &&
                nextVisit.programEnrolment.scheduledEncountersOfType(nextVisit.encounterType) || existingScheduledVisitsForSameEncounter;
            const existingVisit = _.find(existingScheduleVisits, e => e.uuid === nextVisit.uuid);
            if (
                _.isNil(existingVisit) ||
                !General.datesAreSame(existingVisit.earliestDate, nextVisit.earliestDate) ||
                !General.datesAreSame(existingVisit.maxDate, nextVisit.maxDate) ||
                existingVisit.name !== nextVisit.name
            ) {
                scheduledVisits.push(nextVisit);
            }
        });

        service.saveOrUpdate(newState.programEncounter, scheduledVisits, action.skipCreatingPendingStatus);

        action.cb(newState.programEncounter, false);
        return newState;
    }

    static encounterDateTimeChanged(state, action, context) {
        const newState = state.clone();
        newState.programEncounter.encounterDateTime = action.value;
        newState.handleValidationResults(newState.programEncounter.validate(), context);
        const formElementStatuses = ObservationsHolderActions.updateFormElements(newState.formElementGroup, newState, context);
        newState.observationsHolder.removeNonApplicableObs(newState.formElementGroup.getFormElements(), newState.filteredFormElements);
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        return newState;
    }

    static displayMessage(state) {
        const newState = state.clone();
        newState.messageDisplayed = false;
        return newState;
    }
}

const ProgramEncounterActionsNames = {
    ON_LOAD: 'PEncA.ON_LOAD',
    TOGGLE_MULTISELECT_ANSWER: "PEncA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "PEncA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'PEncA.PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'PEncA.PRIMITIVE_VALUE_END_EDITING',
    DATE_DURATION_CHANGE: 'PEncA.DATE_DURATION_CHANGE',
    DURATION_CHANGE: 'PEncA.DURATION_CHANGE',
    PREVIOUS: 'PEncA.PREVIOUS',
    NEXT: 'PEncA.NEXT',
    SUMMARY_PAGE: 'PEncA.SUMMARY_PAGE',
    ENCOUNTER_DATE_TIME_CHANGED: "PEncA.ENROLMENT_DATE_TIME_CHANGED",
    SAVE: "PEncA.SAVE",
    SET_ENCOUNTER_LOCATION: "PEncA.SET_ENCOUNTER_LOCATION",
    SET_LOCATION_ERROR: "PEncA.SET_LOCATION_ERROR",
    DISPLAY_MESSAGE: "PEncA.DISPLAY_MESSAGE",
    PHONE_NUMBER_CHANGE: "PEncA.PHONE_NUMBER_CHANGE",
    ON_SUCCESS_OTP_VERIFICATION: "PEncA.ON_SUCCESS_OTP_VERIFICATION",
    ON_SKIP_VERIFICATION: "PEncA.ON_SKIP_VERIFICATION",
};

const ProgramEncounterActionsMap = new Map([
    [ProgramEncounterActionsNames.ON_LOAD, ProgramEncounterActions.onLoad],
    [ProgramEncounterActionsNames.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [ProgramEncounterActionsNames.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [ProgramEncounterActionsNames.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [ProgramEncounterActionsNames.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [ProgramEncounterActionsNames.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [ProgramEncounterActionsNames.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [ProgramEncounterActionsNames.NEXT, ProgramEncounterActions.onNext],
    [ProgramEncounterActionsNames.SUMMARY_PAGE, ProgramEncounterActions.onSummaryPage],
    [ProgramEncounterActionsNames.PREVIOUS, ProgramEncounterActions.onPrevious],
    [ProgramEncounterActionsNames.ENCOUNTER_DATE_TIME_CHANGED, ProgramEncounterActions.encounterDateTimeChanged],
    [ProgramEncounterActionsNames.SAVE, ProgramEncounterActions.onSave],
    [ProgramEncounterActionsNames.SET_ENCOUNTER_LOCATION, ProgramEncounterActions.setEncounterLocation],
    [ProgramEncounterActionsNames.SET_LOCATION_ERROR, GeolocationActions.setLocationError],
    [ProgramEncounterActionsNames.DISPLAY_MESSAGE, ProgramEncounterActions.displayMessage],
    [ProgramEncounterActionsNames.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [ProgramEncounterActionsNames.ON_SUCCESS_OTP_VERIFICATION, PhoneNumberVerificationActions.onSuccessVerification],
    [ProgramEncounterActionsNames.ON_SKIP_VERIFICATION, PhoneNumberVerificationActions.onSkipVerification],
]);

export {
    ProgramEncounterActionsNames,
    ProgramEncounterActionsMap,
    ProgramEncounterActions
};
