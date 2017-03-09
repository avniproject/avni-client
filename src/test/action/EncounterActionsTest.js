import {expect} from "chai";
import {EncounterActions} from "../../js/action/individual/EncounterActions";
import ObservationsHolderActions from "../../js/action/common/ObservationsHolderActions";
import Encounter from "../../js/models/Encounter";
import Observation from "../../js/models/Observation";
import FormElement from "../../js/models/application/FormElement";
import Concept, {ConceptAnswer} from "../../js/models/Concept";
import EntityFactory from "../models/EntityFactory";
import Wizard from "../../js/state/Wizard";
import EncounterActionState from "../../js/state/EncounterActionState";
import PrimitiveValue from "../../js/models/observation/PrimitiveValue";
import ValidationResult from "../../js/models/application/ValidationResult";

let createFormElement = function (dataType, mandatory, conceptUUID) {
    const formElement = new FormElement();
    formElement.uuid = 'be5b6739-e812-4be5-b0f4-7c5865889883';
    formElement.mandatory = mandatory;
    const concept = Concept.create('', dataType);
    concept.uuid = conceptUUID;
    formElement.concept = concept;
    return formElement;
};

let createIntialState = function (dataType, mandatory) {
    const formElement = createFormElement(dataType, mandatory, 'bfc28bad-5fac-4760-921d-eec83f52c3da');
    const formElementGroup = EntityFactory.createFormElementGroup('FooConcept', 1, EntityFactory.createForm());
    formElementGroup.addFormElement(formElement);
    const state = new EncounterActionState([], formElementGroup, new Wizard(2, 1));
    state.encounter = Encounter.create();
    state.encounter.encounterDateTime = new Date();
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

function verifyObservationValues(newState, numberOfValues) {
    expect(newState.encounter.observations[0].getValueWrapper().getValue().length).is.equal(numberOfValues, JSON.stringify(newState.encounter.observations));
}

describe('EncounterActionsTest', () => {
    it('validateNumericField without validation error', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '1', formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
        expect(newState.encounter.observations[0].getValueWrapper().getValue()).is.equal(1);
        newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '11', formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
    });

    it('validateNumericField with validation error', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        formElement.concept.lowAbsolute = 10;
        formElement.concept.hiAbsolute = 100;

        const newState = ObservationsHolderActions.onPrimitiveObs(state, {value: 1000, formElement: formElement});
        verifyFormElementAndObservations(newState, 1, 1);
    });

    it('numeric field with a string', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        const newState = ObservationsHolderActions.onPrimitiveObs(state, {value: 'a', formElement: formElement});
        expect(newState.encounter.observations.length).is.equal(0);
        newState.encounter.observations.push(Observation.create(formElement.concept, new PrimitiveValue(10, Concept.dataType.Numeric)));
        const newerState = ObservationsHolderActions.onPrimitiveObs(newState, {value: 'a', formElement: formElement});
        expect(newerState.encounter.observations[0].getValueWrapper().getValue()).is.equal(10);
    });

    it('validateMultiSelect field when it is mandatory', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Coded, true);
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
        const {state, formElement} = createIntialState(Concept.dataType.Coded, false);
        const answerUUID = 'b4ed3172-6ab9-4fca-8464-74fb9a298593';
        formElement.concept.answers = [createConceptAnswer(answerUUID), createConceptAnswer('ae5f7668-cdfb-4a23-bcd0-98b3a0c68c1f')];
        var newState = ObservationsHolderActions.toggleMultiSelectAnswer(state, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);

        newState = ObservationsHolderActions.toggleMultiSelectAnswer(newState, {answerUUID: answerUUID, formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 0);
    });

    it('scenario - 1', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
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
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        const anotherNumericFormElement = createFormElement(Concept.dataType.Numeric, false, 'c2c3a7a7-6b6f-413b-8f4c-9785a6c04b5e');

        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '14', formElement: formElement});
        newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '10', formElement: anotherNumericFormElement});
        expect(newState.encounter.observations.length).is.equal(2);
        newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '', formElement: anotherNumericFormElement});
        expect(newState.encounter.observations.length).is.equal(1);
        expect(newState.encounter.observations[0].getValueWrapper().getValue()).is.equal(14);
    });

    it('next should not be allowed if there are validation errors in the same FEG', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);
        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '', formElement: formElement});
        verifyFormElementAndObservations(newState, 1, 0);
        newState = EncounterActions.onNext(newState, {
            movedNext: () => {
                expect('everything').to.not.be.ok;
            },
            validationFailed: () => {}
        });
        verifyFormElementAndObservations(newState, 1, 0);
        newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '10', formElement: formElement});
        verifyFormElementAndObservations(newState, 0, 1);
        newState = EncounterActions.onNext(newState, {
            movedNext: () => {
                expect('everything').to.be.ok;
            }
        });
        verifyFormElementAndObservations(newState, 0, 1);
    });

    it('next should be allowed if there are no validation errors in the same FEG', () => {
        const {state, formElement} = createIntialState(Concept.dataType.Numeric, true);

        var valueToBeModifiedInCallback = 1;
        var anotherFormElement = createFormElement(Concept.dataType.Numeric, true, '1de2dfdf-1cd6-4506-a76d-1fe06751e7be');
        anotherFormElement.uuid = '6c0630a4-fdc7-4c4b-939b-e07710ee92a0';
        const anotherFormElementGroup = EntityFactory.createFormElementGroup('BarConcept', 1, EntityFactory.createForm());
        anotherFormElementGroup.addFormElement(anotherFormElement);
        var newState = ObservationsHolderActions.onPrimitiveObs(state, {value: '', formElement: anotherFormElement});
        verifyFormElementAndObservations(newState, 1, 0);
        var newState = ObservationsHolderActions.onPrimitiveObs(newState, {value: '10', formElement: formElement});
        newState = EncounterActions.onNext(newState, {
            movedNext: () => {
                valueToBeModifiedInCallback = 4;
            }
        });
        verifyFormElementAndObservations(newState, 1, 1);
        expect(valueToBeModifiedInCallback).is.equal(4);
    });

});