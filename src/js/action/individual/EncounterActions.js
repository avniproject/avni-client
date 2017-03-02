import IndividualEncounterService from "../../service/IndividualEncounterService";
import EntityService from "../../service/EntityService";
import Form from "../../models/application/Form";
import _ from "lodash";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import EncounterActionState from "../../state/EncounterActionState";
import ObservationsHolderActions from '../common/ObservationsHolderActions';
import Wizard from "../../state/Wizard";

export class EncounterActions {
    static getInitialState(context) {
        return {};
    }

    static onNewEncounter(state, action, context) {
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.Encounter, Form.schema.name);
        const newState = new EncounterActionState([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1));
        newState.encounter = context.get(IndividualEncounterService).newEncounter(action.individualUUID);
        return newState;
    }

    static onPrevious(state, action, context) {
        const newState = state.clone();
        newState.movePrevious();
        action.cb(newState.formElementGroup.isFirst);
        return newState;
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        const encounter = newState.encounter;
        const validationResults = newState.formElementGroup.validateMandatoryFields(encounter);
        newState.handleValidationResults(validationResults);
        if (EncounterActions.anyFailedResultForCurrentFEG(validationResults, newState.formElementGroup)) {
            return newState;
        }

        if (newState.wizard.isLastPage()) {
            const decisionSupportValidationResult = context.get(RuleEvaluationService).validateEncounter(encounter);
            if (decisionSupportValidationResult.passed) {
                var encounterDecisions = context.get(RuleEvaluationService).getEncounterDecision(encounter);
                context.get(IndividualEncounterService).addDecisions(encounter, encounterDecisions);
                action.validationSuccessful(encounterDecisions, newState.encounter, newState.formElementGroup);
            } else {
                action.validationError(decisionSupportValidationResult.message);
            }
        } else {
            newState.moveNext();
            action.cb();
        }
        return newState;
    }

    static anyFailedResultForCurrentFEG(validationResults, formElementGroup) {
        const formUUIDs = formElementGroup.formElements.map((formElement) => {
            return formElement.uuid
        });
        return _.some(validationResults, (validationResult) => {
            return validationResult.success === false && formUUIDs.indexOf(validationResult.formIdentifier) != -1;
        }) ;
    }

    static onEncounterViewLoad(state, action, context) {
        return state.clone();
    }

    static onEncounterDateTimeChange(state, action, context) {
        const newState = state.clone();
        newState.encounter.encounterDateTime = action.value;
        return newState;
    }

    static onToggleShowingPreviousEncounter(state, action, context) {
        const newState = state.clone();
        newState.wizard.toggleShowPreviousEncounter();
        newState.encounters = context.get(IndividualEncounterService).getEncounters(state.encounter.individual);
        return newState;
    }
}

const individualEncounterViewActions = {
    NEW_ENCOUNTER: '034f29e9-6204-49b3-b9fe-fec38851b966',
    ENCOUNTER_DATE_TIME_CHANGE: '42101ad3-9e4f-46d0-913d-51f3d9c4cc66',
    PREVIOUS: '4ebe84f9-6230-42af-ba0d-88d78c05005a',
    NEXT: '14bd2402-c588-4f16-9c63-05a85751977e',
    TOGGLE_MULTISELECT_ANSWER: "c5407cf4-f37a-4568-9d56-ffba58a3bafe",
    TOGGLE_SINGLESELECT_ANSWER: "6840941d-1f74-43ff-bd20-161e580abdc8",
    PRIMITIVE_VALUE_CHANGE: '781a72ec-1ca1-4a03-93f8-379b5a828d6c',
    ON_LOAD: '71d74559-0fc0-4b9a-b996-f5c14f1ef56c',
    ON_SYNC_COMPLETED: 'ON_SYNC_COMPLETED',
    TOGGLE_SHOWING_PREVIOUS_ENCOUNTER : '1107f87c-b230-445b-bc40-7e9765051cb7'
};

const individualEncounterViewActionsMap = new Map([
    [individualEncounterViewActions.PREVIOUS, EncounterActions.onPrevious],
    [individualEncounterViewActions.NEXT, EncounterActions.onNext],
    [individualEncounterViewActions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [individualEncounterViewActions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [individualEncounterViewActions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObs],
    [individualEncounterViewActions.NEW_ENCOUNTER, EncounterActions.onNewEncounter],
    [individualEncounterViewActions.ON_LOAD, EncounterActions.onEncounterViewLoad],
    [individualEncounterViewActions.NEW_ENCOUNTER, EncounterActions.onNewEncounter],
    [individualEncounterViewActions.ENCOUNTER_DATE_TIME_CHANGE, EncounterActions.onEncounterDateTimeChange],
    [individualEncounterViewActions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER, EncounterActions.onToggleShowingPreviousEncounter]


]);

export {
    individualEncounterViewActions as IndividualEncounterViewActions,
    individualEncounterViewActionsMap as IndividualEncounterViewActionsMap
};