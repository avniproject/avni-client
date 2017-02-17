import {expect} from "chai";
import {EncounterActions} from "../../js/action/individual/EncounterActions";
import Encounter from "../../js/models/Encounter";
import FormElement from "../../js/models/application/FormElement";
import Concept, {ConceptAnswer} from "../../js/models/Concept";
import EntityFactory from "../models/EntityFactory";

let createFormElement = function (dataType, mandatory, conceptUUID) {
    const formElement = new FormElement();
    formElement.mandatory = mandatory;
    const concept = Concept.create('', dataType);
    concept.uuid = conceptUUID;
    formElement.concept = concept;
    return formElement;
};

let createIntialState = function (dataType, mandatory) {
    const state = EncounterActions.getInitialState();
    const formElement = createFormElement(dataType, mandatory, 'bfc28bad-5fac-4760-921d-eec83f52c3da');
    state.encounter = Encounter.create();
    state.formElementGroup = EntityFactory.createFormElementGroup('', 1, EntityFactory.createForm());
    state.formElementGroup.addFormElement(formElement);
    return {state, formElement};
};

let createConceptAnswer = function (answerUUID) {
    const concept = new Concept();
    const conceptAnswer = new ConceptAnswer();
    conceptAnswer.concept = concept;
    conceptAnswer.uuid = answerUUID;
    return conceptAnswer;
};

let verifyFormElementAndObservations = function (newState, numberOfValidationErrors, numberOfObs) {
    expect(newState.validationResults.length).is.equal(numberOfValidationErrors, JSON.stringify(newState.validationResults));
    expect(newState.encounter.observations.length).is.equal(numberOfObs, JSON.stringify(newState.encounter.observations));
};

describe('EncounterActionsTest', () => {
    it('validateNumericField without validation error', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);

        var newState = EncounterActions.onPrimitiveObs(state, {value: 1, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
        expect(newState.encounter.observations[0].getValue()).is.equal(1);
        newState = EncounterActions.onPrimitiveObs(newState, {value: 11, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
    });

    it('validateNumericField with validation error', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        formElement.concept.lowAbsolute = 10;
        formElement.concept.hiAbsolute = 100;

        const newState = EncounterActions.onPrimitiveObs(state, {value: 1000, formElement: formElement});
        verifyFormElementAndObservations(newState, 1, 1);
    });

    it('numeric field with a string', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        const newState = EncounterActions.onPrimitiveObs(state, {value: 'a', formElement: formElement});
        expect(newState.encounter.observations[0].getValue()).is.equal('a');
    });

    it('validateMultiSelect field when it is mandatory', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Coded, true);
        const answerUUID = 'b4ed3172-6ab9-4fca-8464-74fb9a298593';
        formElement.concept.answers = [createConceptAnswer(answerUUID), createConceptAnswer('ae5f7668-cdfb-4a23-bcd0-98b3a0c68c1f')];
        var newState = EncounterActions.toggleMultiSelectAnswer(state, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);

        newState = EncounterActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 1, 0);
    });

    it('validateMultiSelect field when it is not mandatory', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Coded, false);
        const answerUUID = 'b4ed3172-6ab9-4fca-8464-74fb9a298593';
        formElement.concept.answers = [createConceptAnswer(answerUUID), createConceptAnswer('ae5f7668-cdfb-4a23-bcd0-98b3a0c68c1f')];
        var newState = EncounterActions.toggleMultiSelectAnswer(state, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);

        newState = EncounterActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 0);
    });

    it('scenario - 1', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        const multiSelectFormElement = createFormElement(Concept.dataType.Coded, true, 'c2c3a7a7-6b6f-413b-8f4c-9785a6c04b5e');
        const answerUUID = 'b4ed3172-6ab9-4fca-8464-74fb9a298593';
        multiSelectFormElement.concept.answers = [createConceptAnswer(answerUUID), createConceptAnswer('ae5f7668-cdfb-4a23-bcd0-98b3a0c68c1f')];

        var newState = EncounterActions.onPrimitiveObs(state, {value: 1, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);

        newState = EncounterActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: multiSelectFormElement});
        verifyFormElementAndObservations(newState, 0, 2);

        newState = EncounterActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: multiSelectFormElement});
        verifyFormElementAndObservations(newState, 1, 1);
        expect(newState.encounter.observations[0].concept.datatype).is.equal(Concept.dataType.Numeric);

        newState = EncounterActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: multiSelectFormElement});
        verifyFormElementAndObservations(newState, 0, 2);
    });

    it('scenario - 2', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        const anotherNumericFormElement = createFormElement(Concept.dataType.Numeric, false, 'c2c3a7a7-6b6f-413b-8f4c-9785a6c04b5e');

        var newState = EncounterActions.onPrimitiveObs(state, {value: 14, formElement: formElement});
        newState = EncounterActions.onPrimitiveObs(newState, {value: 10, formElement: anotherNumericFormElement});
        expect(newState.encounter.observations.length).is.equal(2);
        newState = EncounterActions.onPrimitiveObs(newState, {value: '', formElement: anotherNumericFormElement});
        expect(newState.encounter.observations.length).is.equal(1);
        expect(newState.encounter.observations[0].getValue()).is.equal(14);
    });

    it('next should not be allowed if there are validation errors', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        var newState = EncounterActions.onPrimitiveObs(state, {value: '', formElement: formElement});
        newState = EncounterActions.onNext(newState);
        verifyFormElementAndObservations(newState, 1, 0);
        newState = EncounterActions.onPrimitiveObs(state, {value: 10, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
    });
});