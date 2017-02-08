import IndividualEncounterService from "../../service/IndividualEncounterService";
import EntityService from "../../service/EntityService";
import Form from "../../models/application/Form";
import _ from 'lodash';
import RuleEvaluationService from "../../service/RuleEvaluationService";

export class EncounterActions {
    static getInitialState() {
        return {
            formElementGroup: null,
            encounter: null,
            validationResult: null,
            encounterDecisions: null
        };
    }

    static clone(state) {
        const newState = {};
        newState.encounter = state.encounter.cloneForNewEncounter();
        newState.formElementGroup = state.formElementGroup;
        newState.validationResult = null;
        newState.encounterDecisions = null;
        return newState;
    }

    static onNewEncounter(state, action, context) {
        const newState = {};
        newState.encounter = context.get(IndividualEncounterService).newEncounter(action.individualUUID);
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.Encounter, Form.schema.name);
        newState.formElementGroup = form.formElementGroups[0];
        return newState;
    }

    static onPrimitiveObs(state, action, context) {
        const newState = EncounterActions.clone(state);
        newState.encounter.addOrUpdatePrimitiveObs(action.formElement.concept, action.value);
        return newState;
    }

    static toggleMultiSelectAnswer(state, action) {
        const newState = EncounterActions.clone(state);
        newState.encounter.toggleMultiSelectAnswer(action.concept, action.answerUUID);
        return newState;
    }

    static toggleSingleSelectAnswer(state, action) {
        const newState = EncounterActions.clone(state);
        state.encounter.toggleSingleSelectAnswer(action.concept, action.answerUUID);
        return newState;
    }

    static onPrevious(state, cb, context) {
        const newState = EncounterActions.clone(state);
        newState.formElementGroup = state.formElementGroup.previous();
        cb(newState.formElementGroup.isFirst());
        return newState;
    }

    static onNext(state, action, context) {
        const formElementGroup = state.formElementGroup.next();
        const encounter = state.encounter;
        var encounterDecisions;

        if (_.isNil(formElementGroup)) {
            const validationResult = context.getBean(RuleEvaluationService).validateEncounter(encounter);
            if (validationResult.passed) {
                encounterDecisions = context.getBean(RuleEvaluationService).getEncounterDecision(encounter);
                context.getBean(IndividualEncounterService).addDecisions(encounter, encounterDecisions);
            }
        }
        action.cb(_.isNil(formElementGroup), encounter, formElementGroup, encounterDecisions);
        return state;
    }

    static onEncounterViewLoad(state, action, context) {
        const newState = {};
        newState.encounter = action.encounter.cloneForNewEncounter();
        newState.formElementGroup = action.formElementGroup;
        return newState;
    }
}

const individualEncounterLandingViewActions = {
    PREVIOUS: 'b7422f46-1574-41ba-b120-01cba1b0db7d',
    NEXT: '887877e7-b376-478d-8c75-c0bac210bcf8',
    TOGGLE_MULTISELECT_ANSWER: "a71ceb47-6a67-4caf-907d-2c93c985c64b",
    TOGGLE_SINGLESELECT_ANSWER: "e3a5f0ea-a5de-44d6-b07b-e5c9cf0d1d5f",
    TEXT_INPUT_CHANGE: '6d34e303-318c-4e53-83b0-42f673a0e369',
    NEW_ENCOUNTER: '034f29e9-6204-49b3-b9fe-fec38851b966'
};

const individualEncounterLandingViewActionsMap = new Map([
    [individualEncounterLandingViewActions.PREVIOUS, EncounterActions.onPrevious],
    [individualEncounterLandingViewActions.NEXT, EncounterActions.onNext],
    [individualEncounterLandingViewActions.TOGGLE_MULTISELECT_ANSWER, EncounterActions.toggleMultiSelectAnswer],
    [individualEncounterLandingViewActions.TOGGLE_SINGLESELECT_ANSWER, EncounterActions.toggleSingleSelectAnswer],
    [individualEncounterLandingViewActions.TEXT_INPUT_CHANGE, EncounterActions.onPrimitiveObs],
    [individualEncounterLandingViewActions.NEW_ENCOUNTER, EncounterActions.onNewEncounter]
]);

const individualEncounterViewActions = {
    PREVIOUS: '4ebe84f9-6230-42af-ba0d-88d78c05005a',
    NEXT: '14bd2402-c588-4f16-9c63-05a85751977e',
    TOGGLE_MULTISELECT_ANSWER: "c5407cf4-f37a-4568-9d56-ffba58a3bafe",
    TOGGLE_SINGLESELECT_ANSWER: "6840941d-1f74-43ff-bd20-161e580abdc8",
    TEXT_INPUT_CHANGE: '781a72ec-1ca1-4a03-93f8-379b5a828d6c',
    ON_LOAD: '71d74559-0fc0-4b9a-b996-f5c14f1ef56c'
};

const individualEncounterViewActionsMap = new Map([
    [individualEncounterViewActions.PREVIOUS, EncounterActions.onPrevious],
    [individualEncounterViewActions.NEXT, EncounterActions.onNext],
    [individualEncounterViewActions.TOGGLE_MULTISELECT_ANSWER, EncounterActions.toggleMultiSelectAnswer],
    [individualEncounterViewActions.TOGGLE_SINGLESELECT_ANSWER, EncounterActions.toggleSingleSelectAnswer],
    [individualEncounterViewActions.TEXT_INPUT_CHANGE, EncounterActions.onPrimitiveObs],
    [individualEncounterViewActions.NEW_ENCOUNTER, EncounterActions.onNewEncounter],
    [individualEncounterViewActions.ON_LOAD, EncounterActions.onEncounterViewLoad]
]);

export {
    individualEncounterLandingViewActions as IndividualEncounterLandingViewActions,
    individualEncounterLandingViewActionsMap as IndividualEncounterLandingViewActionsMap,
    individualEncounterViewActions as IndividualEncounterViewActions,
    individualEncounterViewActionsMap as IndividualEncounterViewActionsMap
};