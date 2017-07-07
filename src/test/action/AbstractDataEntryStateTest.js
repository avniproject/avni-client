import {expect} from "chai";
import EntityFactory from "../models/EntityFactory";
import Wizard from "../../js/state/Wizard";
import Concept from "../../js/models/Concept";
import WizardNextActionStub from "./WizardNextActionStub";
import ValidationResult from "../../js/models/application/ValidationResult";
import StubbedDataEntryState from "./StubbedDataEntryState";
import Observation from "../../js/models/Observation";
import PrimitiveValue from "../../js/models/observation/PrimitiveValue";
import ObservationsHolderActions from '../../js/action/common/ObservationsHolderActions';
import TestContext from "../views/testframework/TestContext";

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