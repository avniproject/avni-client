import IndividualEncounterService from "../../service/IndividualEncounterService";
import EntityService from "../../service/EntityService";
import Form from "../../models/application/Form";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import EncounterActionState from "../../state/EncounterActionState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import _ from "lodash";
import Wizard from "../../state/Wizard";
import Encounter from '../../models/Encounter';

export class EncounterActions {
    static getInitialState(context) {
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.Encounter, Form.schema.name);
        return {form: form};
    }

    static clone(state) {
        const newState = state.clone();
        newState.form = state.form;
        return newState;
    }

    static onEncounterLandingViewLoad(state, action, context) {
        const isNewEncounter = _.isNil(action.encounterUUID);
        const encounter = isNewEncounter ? context.get(IndividualEncounterService).newEncounter(action.individualUUID) : context.get(EntityService).findByUUID(action.encounterUUID, Encounter.schema.name);
        const newState = EncounterActionState.createOnLoadState(state.form, encounter, isNewEncounter);
        newState.form = state.form;
        return newState;
    }

    static onNext(state, action, context) {
        const newState = EncounterActions.clone(state);
        const encounter = newState.encounter;

        const customAction = {
            validationFailed: () => {
                action.validationFailed(newState);
            },
            completed: () => {
                const validationResult = context.get(RuleEvaluationService).validateEncounter(encounter);
                newState.handleValidationResult(validationResult);
                if (validationResult.success) {
                    var encounterDecisions = context.get(RuleEvaluationService).getEncounterDecision(encounter);
                    context.get(IndividualEncounterService).addDecisions(encounter, encounterDecisions);
                    action.completed(newState, encounterDecisions);
                } else {
                    action.validationFailed(newState);
                }
            },
            movedNext: () => {
                action.movedNext(newState);
            },
        };
        newState.handleNext(customAction, encounter.validate(), () => {
        });
        return newState;
    }

    static onEncounterViewLoad(state, action, context) {
        return EncounterActions.clone(state);
    }

    static onEncounterDateTimeChange(state, action, context) {
        const newState = EncounterActions.clone(state);
        newState.encounter.encounterDateTime = action.value;
        return newState;
    }

    static onToggleShowingPreviousEncounter(state, action, context) {
        const newState = EncounterActions.clone(state);
        newState.wizard.toggleShowPreviousEncounter();
        newState.encounters = context.get(IndividualEncounterService).getEncounters(state.encounter.individual);
        return newState;
    }
}

const individualEncounterViewActions = {
    ON_ENCOUNTER_LANDING_LOAD: '034f29e9-6204-49b3-b9fe-fec38851b966',
    ENCOUNTER_DATE_TIME_CHANGE: '42101ad3-9e4f-46d0-913d-51f3d9c4cc66',
    PREVIOUS: '4ebe84f9-6230-42af-ba0d-88d78c05005a',
    NEXT: '14bd2402-c588-4f16-9c63-05a85751977e',
    TOGGLE_MULTISELECT_ANSWER: "c5407cf4-f37a-4568-9d56-ffba58a3bafe",
    TOGGLE_SINGLESELECT_ANSWER: "6840941d-1f74-43ff-bd20-161e580abdc8",
    PRIMITIVE_VALUE_CHANGE: '781a72ec-1ca1-4a03-93f8-379b5a828d6c',
    ON_LOAD: '71d74559-0fc0-4b9a-b996-f5c14f1ef56c',
    TOGGLE_SHOWING_PREVIOUS_ENCOUNTER: '1107f87c-b230-445b-bc40-7e9765051cb7'
};

const individualEncounterViewActionsMap = new Map([
    [individualEncounterViewActions.PREVIOUS, ObservationsHolderActions.onPrevious],
    [individualEncounterViewActions.NEXT, EncounterActions.onNext],
    [individualEncounterViewActions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [individualEncounterViewActions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [individualEncounterViewActions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObs],
    [individualEncounterViewActions.ON_LOAD, EncounterActions.onEncounterViewLoad],
    [individualEncounterViewActions.ON_ENCOUNTER_LANDING_LOAD, EncounterActions.onEncounterLandingViewLoad],
    [individualEncounterViewActions.ENCOUNTER_DATE_TIME_CHANGE, EncounterActions.onEncounterDateTimeChange],
    [individualEncounterViewActions.TOGGLE_SHOWING_PREVIOUS_ENCOUNTER, EncounterActions.onToggleShowingPreviousEncounter]
]);

export {
    individualEncounterViewActions as IndividualEncounterViewActions,
    individualEncounterViewActionsMap as IndividualEncounterViewActionsMap
};