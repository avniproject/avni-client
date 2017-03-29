import {expect} from "chai";
import {EncounterActions} from "../../js/action/individual/EncounterActions";
import ObservationsHolderActions from "../../js/action/common/ObservationsHolderActions";
import Encounter from "../../js/models/Encounter";
import Observation from "../../js/models/Observation";
import Individual from "../../js/models/Individual";
import FormElement from "../../js/models/application/FormElement";
import Concept, {ConceptAnswer} from "../../js/models/Concept";
import EntityFactory from "../models/EntityFactory";
import Wizard from "../../js/state/Wizard";
import EncounterActionState from "../../js/state/EncounterActionState";
import PrimitiveValue from "../../js/models/observation/PrimitiveValue";
import WizardNextActionStub from '../action/WizardNextActionStub';
import TestContext from "../views/testframework/TestContext";

let createFormElement = function (dataType, mandatory, conceptUUID) {
    const formElement = new FormElement();
    formElement.uuid = 'be5b6739-e812-4be5-b0f4-7c5865889883';
    formElement.mandatory = mandatory;
    const concept = EntityFactory.createConcept('', dataType);
    concept.uuid = conceptUUID;
    formElement.concept = concept;
    return formElement;
};

let createIntialState = function (dataType, firstFormElementMandatory, secondFormElementMandatory) {
    const form = EntityFactory.createForm();
    const formElementGroup = EntityFactory.createFormElementGroup('FooConcept', 1, form);
    const formElement = createFormElement(dataType, firstFormElementMandatory, 'bfc28bad-5fac-4760-921d-eec83f52c3da');
    formElementGroup.addFormElement(formElement);

    const formElementGroup2 = EntityFactory.createFormElementGroup('Bar', 2, form);
    const formElement2 = createFormElement(dataType, secondFormElementMandatory, 'd1ab1bfd-aa13-4e86-ac67-9b46387ee446');
    formElementGroup2.addFormElement(formElement2);

    const state = new EncounterActionState([], formElementGroup, new Wizard(2, 1));
    state.encounter = Encounter.create();
    state.encounter.individual = Individual.createEmptyInstance();
    state.encounter.encounterDateTime = new Date();
    return {state, formElement, formElement2};
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

function verifyObservationValues(newState, numberOfValues) {
    expect(newState.encounter.observations[0].getValue().length).is.equal(numberOfValues, JSON.stringify(newState.encounter.observations));
}

describe('EncounterActionsTest', () => {
    it('validateNumericField without validation error', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true, false);

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '1', formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
        expect(newState.encounter.observations[0].getValue()).is.equal(1);
        newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '11', formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
    });

    it('validateNumericField with validation error', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true, false);
        formElement.concept.lowAbsolute = 10;
        formElement.concept.hiAbsolute = 100;

        const newState = ObservationsHolderActions.onPrimitiveObs(state, {value: 1000, formElement: formElement});
        verifyFormElementAndObservations(newState, 1, 1);
    });

    it('numeric field with a string', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true, false);
        const newState = ObservationsHolderActions.onPrimitiveObs(state, {value: 'a', formElement: formElement});
        expect(newState.encounter.observations.length).is.equal(0);
        newState.encounter.observations.push(Observation.create(formElement.concept, new PrimitiveValue(10, Concept.dataType.Numeric)));
        const newerState = ObservationsHolderActions.onPrimitiveObs(newState, {value: 'a', formElement: formElement});
        expect(newerState.encounter.observations[0].getValue()).is.equal(10);
    });

    it('validateMultiSelect field when it is mandatory', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Coded, true, false);
        const answerUUID = 'b4ed3172-6ab9-4fca-8464-74fb9a298593';
        const answerUUID2 = 'ae5f7668-cdfb-4a23-bcd0-98b3a0c68c1f';
        formElement.concept.answers = [createConceptAnswer(answerUUID), createConceptAnswer(answerUUID2)];
        var newState = ObservationsHolderActions.toggleMultiSelectAnswer(state, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
        verifyObservationValues(newState, 1);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID2, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
        verifyObservationValues(newState, 2);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
        verifyObservationValues(newState, 1);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID2, formElement: formElement});
        verifyFormElementAndObservations(newState, 1, 0);
    });

    it('validateMultiSelect field when it is not mandatory', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Coded, false, false);
        const answerUUID = 'b4ed3172-6ab9-4fca-8464-74fb9a298593';
        formElement.concept.answers = [createConceptAnswer(answerUUID), createConceptAnswer('ae5f7668-cdfb-4a23-bcd0-98b3a0c68c1f')];
        var newState = ObservationsHolderActions.toggleMultiSelectAnswer(state, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 0);
    });

    it('scenario - 1', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true, false);
        const multiSelectFormElement = createFormElement(Concept.dataType.Coded, true, 'c2c3a7a7-6b6f-413b-8f4c-9785a6c04b5e');
        const answerUUID = 'b4ed3172-6ab9-4fca-8464-74fb9a298593';
        multiSelectFormElement.concept.answers = [createConceptAnswer(answerUUID), createConceptAnswer('ae5f7668-cdfb-4a23-bcd0-98b3a0c68c1f')];

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '1', formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: multiSelectFormElement});
        verifyFormElementAndObservations(newState, 0, 2);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: multiSelectFormElement});
        verifyFormElementAndObservations(newState, 1, 1);
        expect(newState.encounter.observations[0].concept.datatype).is.equal(Concept.dataType.Numeric);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: multiSelectFormElement});
        verifyFormElementAndObservations(newState, 0, 2);
    });

    it('scenario - 2', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true, false);
        const anotherNumericFormElement = createFormElement(Concept.dataType.Numeric, false, 'c2c3a7a7-6b6f-413b-8f4c-9785a6c04b5e');

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '14', formElement: formElement});
        newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '10', formElement: anotherNumericFormElement});
        expect(newState.encounter.observations.length).is.equal(2);
        newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '', formElement: anotherNumericFormElement});
        expect(newState.encounter.observations.length).is.equal(1);
        expect(newState.encounter.observations[0].getValue()).is.equal(14);
    });

    it('next should not be allowed if there are validation errors in the same FEG', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true, false);
        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '', formElement: formElement});
        verifyFormElementAndObservations(newState, 1, 0);
        var action = WizardNextActionStub.forValidationFailed();
        newState = EncounterActions.onNext(newState, action);
        verifyFormElementAndObservations(newState, 1, 0);
        action.assert();

        newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '10', formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);

        action = WizardNextActionStub.forMovedNext();
        newState = EncounterActions.onNext(newState, action);
        action.assert();
        verifyFormElementAndObservations(newState, 0, 1);
    });

    it('next should be allowed if there are no validation errors in the same FEG', () => {
        const {state, formElement, formElement2} = createIntialState(Concept.dataType.Numeric, true, true);

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '10', formElement: formElement});
        newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '', formElement: formElement2});
        var action = WizardNextActionStub.forMovedNext();
        newState = EncounterActions.onNext(newState, action);
        action.assert();
        verifyFormElementAndObservations(newState, 0, 1);
    });

    it('next on second view should be allowed without filling non-mandatory form element', () => {
        const {state, formElement, formElement2} = createIntialState(Concept.dataType.Numeric, true, false);

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '10', formElement: formElement});
        var action = WizardNextActionStub.forMovedNext();
        newState = EncounterActions.onNext(newState, action);

        action = WizardNextActionStub.forCompleted();
        newState = EncounterActions.onNext(newState, action, new TestContext());
        action.assert();
    });

    it('next on second view should give validation error', () => {
        const {state, formElement, formElement2} = createIntialState(Concept.dataType.Numeric, true, true);

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '10', formElement: formElement});
        var action = WizardNextActionStub.forMovedNext();
        newState = EncounterActions.onNext(newState, action);

        action = WizardNextActionStub.forValidationFailed();
        newState = EncounterActions.onNext(newState, action, new TestContext());
        action.assert();
        verifyFormElementAndObservations(newState, 1, 1);
    });
});