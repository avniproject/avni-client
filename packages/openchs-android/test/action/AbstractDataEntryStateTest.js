import {expect} from "chai";
import {ValidationResult, Observation, PrimitiveValue, Concept} from "openchs-models";
import Wizard from "../../src/state/Wizard";
import WizardNextActionStub from "./WizardNextActionStub";
import StubbedDataEntryState from "./StubbedDataEntryState";
import ObservationsHolderActions from '../../src/action/common/ObservationsHolderActions';
import TestContext from "./views/testframework/TestContext";
import EntityFactory from "../../../openchs-models/test/EntityFactory";

describe('AbstractDataEntryStateTest', () => {
    var formElementGroup;
    var testContext;

    beforeEach(function () {
        formElementGroup = EntityFactory.createSafeFormElementGroup(EntityFactory.createForm('foo'));
        testContext = new TestContext();
    });

    it('next when there are validation errors', () => {
        const concept = EntityFactory.createConcept('c1', Concept.dataType.Boolean);
        const formElement = EntityFactory.createFormElement('bar', true, concept);
        formElementGroup.addFormElement(formElement);

        var dataEntryState = new StubbedDataEntryState([ValidationResult.failureForEmpty('h')], formElementGroup, new Wizard(1, 1), []);
        var action = WizardNextActionStub.forValidationFailed();
        dataEntryState.handleNext(action, testContext);
        action.assert();

        dataEntryState = new StubbedDataEntryState([ValidationResult.successful('h')], formElementGroup, new Wizard(1, 1), []);
        action = WizardNextActionStub.forValidationFailed();
        dataEntryState.handleNext(action, testContext);
        action.assert();

        dataEntryState = new StubbedDataEntryState([ValidationResult.successful('h')], formElementGroup, new Wizard(1, 1), [Observation.create(concept, new PrimitiveValue(true))]);
        action = WizardNextActionStub.forCompleted();
        dataEntryState.handleNext(action, testContext);
        action.assert();
    });

    it('single select form element data entry', () => {
        const concept = EntityFactory.createConcept('c1', Concept.dataType.Coded);
        EntityFactory.addCodedAnswers(concept, ['a1', 'a2', 'a3']);
        const formElement = EntityFactory.createFormElement('bar', true, concept);
        formElementGroup.addFormElement(formElement);

        var dataEntryState = new StubbedDataEntryState([], formElementGroup, new Wizard(1, 1), []);
        dataEntryState = ObservationsHolderActions.toggleSingleSelectAnswer(dataEntryState, {formElement: formElement, answerUUID: concept.getPossibleAnswerConcept('a1').uuid})
        const observation = dataEntryState.observationsHolder.findObservation(concept);
        expect(observation.getValueWrapper().getConceptUUID()).is.equal(concept.getPossibleAnswerConcept('a1').uuid);
    });
});