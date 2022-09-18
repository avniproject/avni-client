import EncounterService from "../../service/EncounterService";
import EncounterActionState from "../../state/EncounterActionState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import FormMappingService from "../../service/FormMappingService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Encounter, Form, Point, WorkItem, WorkList, WorkLists} from 'avni-models';
import GeolocationActions from "../common/GeolocationActions";
import General from "../../utility/General";
import EntityService from "../../service/EntityService";
import PhoneNumberVerificationActions from "../common/PhoneNumberVerificationActions";
import QuickFormEditingActions from "../common/QuickFormEditingActions";
import TimerActions from "../common/TimerActions";
import IndividualService from "../../service/IndividualService";
import UserInfoService from "../../service/UserInfoService";
import _ from "lodash";
import {ObservationsHolder} from "openchs-models";

export class EncounterActions {
    static getInitialState(context) {
        return {};
    }

    static filterFormElements(formElementGroup, context, encounter) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(encounter, Encounter.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onEncounterLandingViewLoad(state, action, context) {
        const formMapping = context.get(FormMappingService).getIndividualEncounterFormMapping(action.encounter.encounterType, action.encounter.individual.subjectType);

        const form = formMapping && formMapping.form;

        const encounterType = action.encounter.encounterType;
        const getPreviousEncounter = () => {
            const previousEncounter = action.encounter.individual.findLastEncounterOfType(action.encounter, [encounterType.name]);
            if (previousEncounter) {
                action.encounter = previousEncounter.cloneForEdit();
                const observationsHolder = new ObservationsHolder(action.encounter.observations);
                let groupNo = 0;
                const firstGroupWithAtLeastOneVisibleEmptyElement = _.find(form.getFormElementGroups(),
                    (formElementGroup) => {
                        groupNo = groupNo + 1;
                        let filteredFormElements = EncounterActions.filterFormElements(formElementGroup, context, previousEncounter);
                        return formElementGroup.hasEmptyFormElement(filteredFormElements, observationsHolder);
                    });

                if (_.isUndefined(firstGroupWithAtLeastOneVisibleEmptyElement))
                    action.allElementsFilledForImmutableEncounter = true;
                else
                    action.pageNumber = groupNo;
            }
            return action.encounter;
        };

        const encounterToPass = encounterType.immutable && _.isUndefined(action.pageNumber) ? getPreviousEncounter() : action.encounter;

        const firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => EncounterActions.filterFormElements(formElementGroup, context, encounterToPass).length !== 0);

        const isNewEntity = _.isNil(context.get(EntityService).findByUUID(encounterToPass.uuid, Encounter.schema.name));
        const workLists = action.workLists || new WorkLists(new WorkList('Encounter', [new WorkItem(
            General.randomUUID(), WorkItem.type.ENCOUNTER, {
                encounterType: encounterToPass.encounterType.name,
                subjectUUID: encounterToPass.individual.uuid
            }
        )]));

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return EncounterActionState.createOnLoadStateForEmptyForm(encounterToPass, form, isNewEntity, workLists)
        }

        const formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(encounterToPass, Encounter.schema.name, firstGroupWithAtLeastOneVisibleElement);
        const filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        const newState = EncounterActionState.createOnLoadState(encounterToPass, form, isNewEntity, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses, workLists, null, context, action.editing);

        if(action.allElementsFilledForImmutableEncounter) {
            newState.allElementsFilledForImmutableEncounter = true;
            newState.wizard.currentPage = form.numberOfPages;
            return newState;
        }

        return QuickFormEditingActions.moveToPage(newState, action, context, EncounterActions);
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        newState.handleNext(action, context);
        return newState;
    }

    static onSummaryPage(state, action, context) {
        return state.clone().handleSummaryPage(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onEncounterDateTimeChange(state, action, context) {
        const newState = state.clone();
        newState.encounter.encounterDateTime = action.value;
        newState.handleValidationResults(newState.encounter.validate(), context);
        return newState;
    }

    static setEncounterLocation(state, action, context) {
        const newState = state.clone();
        const position = action.value;
        newState.encounter.encounterLocation = Point.newInstance(position.coords.latitude, position.coords.longitude);
        newState.handleValidationResult(
            state.validateLocation(
                newState.encounter.encounterLocation,
                Encounter.validationKeys.ENCOUNTER_LOCATION,
                context
            )
        );
        return newState;
    }

    static onToggleShowingPreviousEncounter(state, action, context) {
        const newState = state.clone();
        newState.previousEncountersDisplayed = !newState.previousEncountersDisplayed;
        newState.previousEncounters = context.get(EncounterService).getEncounters(state.encounter.individual);
        return newState;
    }

    static onFocus(state) {
        const newState = state.clone();
        newState.loadPullDownView = true;
        return newState;
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(IndividualService).updateObservations(newState.encounter.individual);
        context.get(EncounterService).saveOrUpdate(newState.encounter, action.nextScheduledVisits, action.skipCreatingPendingStatus);
        action.cb();
        return state;
    }
}

const individualEncounterViewActions = {
    ON_ENCOUNTER_LANDING_LOAD: 'EA.ON_ENCOUNTER_LANDING_LOAD',
    ON_FOCUS: 'EA.ON_FOCUS',
    ENCOUNTER_DATE_TIME_CHANGE: 'EA.',
    PREVIOUS: 'EA.PREVIOUS',
    NEXT: 'EA.NEXT',
    SUMMARY_PAGE: 'EA.SUMMARY_PAGE',
    TOGGLE_MULTISELECT_ANSWER: "EA.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "EA.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'EA.PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'EA.PRIMITIVE_VALUE_END_EDITING',
    DATE_DURATION_CHANGE: 'EA.DATE_DURATION_CHANGE',
    DURATION_CHANGE: 'EA.DURATION_CHANGE',
    TOGGLE_SHOWING_PREVIOUS_ENCOUNTER: 'EA.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER',
    SAVE: 'EA.SAVE',
    SET_ENCOUNTER_LOCATION: "EA.SET_ENCOUNTER_LOCATION",
    SET_LOCATION_ERROR: "EA.SET_LOCATION_ERROR",
    PHONE_NUMBER_CHANGE: "EA.PHONE_NUMBER_CHANGE",
    GROUP_QUESTION_VALUE_CHANGE: "EA.GROUP_QUESTION_VALUE_CHANGE",
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: "EA.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE",
    ON_SUCCESS_OTP_VERIFICATION: "EA.ON_SUCCESS_OTP_VERIFICATION",
    ON_SKIP_VERIFICATION: "EA.ON_SKIP_VERIFICATION",
    ON_TIMED_FORM: "EA.ON_TIMED_FORM",
    ON_START_TIMER: "EA.ON_START_TIMER",
};

const individualEncounterViewActionsMap = new Map([
    [individualEncounterViewActions.PREVIOUS, EncounterActions.onPrevious],
    [individualEncounterViewActions.NEXT, EncounterActions.onNext],
    [individualEncounterViewActions.SUMMARY_PAGE, EncounterActions.onSummaryPage],
    [individualEncounterViewActions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [individualEncounterViewActions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [individualEncounterViewActions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [individualEncounterViewActions.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [individualEncounterViewActions.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [individualEncounterViewActions.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [individualEncounterViewActions.ON_ENCOUNTER_LANDING_LOAD, EncounterActions.onEncounterLandingViewLoad],
    [individualEncounterViewActions.ENCOUNTER_DATE_TIME_CHANGE, EncounterActions.onEncounterDateTimeChange],
    [individualEncounterViewActions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER, EncounterActions.onToggleShowingPreviousEncounter],
    [individualEncounterViewActions.ON_FOCUS, EncounterActions.onFocus],
    [individualEncounterViewActions.SAVE, EncounterActions.onSave],
    [individualEncounterViewActions.SET_ENCOUNTER_LOCATION, EncounterActions.setEncounterLocation],
    [individualEncounterViewActions.SET_LOCATION_ERROR, GeolocationActions.setLocationError],
    [individualEncounterViewActions.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [individualEncounterViewActions.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [individualEncounterViewActions.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onRepeatableGroupQuestionChange],
    [individualEncounterViewActions.ON_SUCCESS_OTP_VERIFICATION, PhoneNumberVerificationActions.onSuccessVerification],
    [individualEncounterViewActions.ON_SKIP_VERIFICATION, PhoneNumberVerificationActions.onSkipVerification],
    [individualEncounterViewActions.ON_TIMED_FORM, TimerActions.onTimedForm],
    [individualEncounterViewActions.ON_START_TIMER, TimerActions.onStartTimer],
]);

export {
    individualEncounterViewActions as IndividualEncounterViewActions,
    individualEncounterViewActionsMap as IndividualEncounterViewActionsMap
};
