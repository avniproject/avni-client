import {expect} from "chai";
import {EncounterActions} from "../../js/action/individual/EncounterActions";
import Encounter from "../../js/models/Encounter";
import FormElement from "../../js/models/application/FormElement";
import Concept from "../../js/models/Concept";

let createIntialState = function () {
    const state = EncounterActions.getInitialState();
    const formElement = new FormElement();
    formElement.mandatory = true;
    formElement.concept = Concept.create('', Concept.dataType.Numeric);
    state.encounter = new Encounter();
    return {state, formElement};
};

describe('EncounterActionsTest', () => {
    it('validateNumericField without validation error', () => {
        const {state, formElement} = createIntialState();

        const newState = EncounterActions.onPrimitiveObs(state, {value: 1, formElement: formElement});
        expect(newState.validationResults.length).is.equal(0, JSON.stringify(newState.validationResults));
        expect(newState.encounter.observations.length).is.equal(1, JSON.stringify(newState.encounter.observations));
    });

    it('validateNumericField with validation error', () => {
        const {state, formElement} = createIntialState();
        formElement.concept.lowAbsolute = 10;
        formElement.concept.hiAbsolute = 100;

        const newState = EncounterActions.onPrimitiveObs(state, {value: 1000, formElement: formElement});
        expect(newState.validationResults.length).is.equal(1, JSON.stringify(newState.validationResults));
        expect(newState.encounter.observations.length).is.equal(1, JSON.stringify(newState.encounter.observations));
    });
});