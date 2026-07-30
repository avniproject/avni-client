import {expect} from "chai";
import {ValidationResult, Observation, PrimitiveValue, Concept, WorkItem, WorkList, WorkLists} from 'avni-models';
import Wizard from "../../src/state/Wizard";
import WizardNextActionStub from "./WizardNextActionStub";
import StubbedDataEntryState from "./StubbedDataEntryState";
import ObservationsHolderActions from '../../src/action/common/ObservationsHolderActions';
import TestContext from "./views/testframework/TestContext";
import EntityFactory from "../EntityFactory";

describe('AbstractDataEntryStateTest', () => {
    var formElementGroup;
    var testContext;

    beforeEach(function () {
        formElementGroup = EntityFactory.createSafeFormElementGroup(EntityFactory.createForm('foo'));
        testContext = new TestContext();
    });

    it('purges stored results for an element-less (hidden) group so they cannot strand the wizard', () => {
        const concept = EntityFactory.createConcept('c1', Concept.dataType.Boolean);
        const formElement = EntityFactory.createFormElement('bar', true, concept);
        formElementGroup.addFormElement(formElement);
        const staleHiddenPageError = new ValidationResult(false, formElement.uuid, 'Please add at least 8 images (currently 0).');
        const unrelatedError = ValidationResult.failureForEmpty('some-other-element');
        const dataEntryState = new StubbedDataEntryState([staleHiddenPageError, unrelatedError], formElementGroup, new Wizard(2, 1), [], null);
        dataEntryState.filteredFormElements = [];   // the group is hidden on this pass

        dataEntryState.removeResultsForEmptyFormElementGroup();

        expect(dataEntryState.validationResults.length).to.equal(1);
        expect(dataEntryState.validationResults[0].formIdentifier).to.equal('some-other-element');
    });

    it('next when there are validation errors', () => {
        const concept = EntityFactory.createConcept('c1', Concept.dataType.Boolean);
        const formElement = EntityFactory.createFormElement('bar', true, concept);
        formElementGroup.addFormElement(formElement);

        const workLists = new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.ENCOUNTER, {
            subjectUUID:'100100100',
            encounterType:'Foo',
        })]));

        var dataEntryState = new StubbedDataEntryState([ValidationResult.failureForEmpty('h')], formElementGroup, new Wizard(1, 1), [], workLists);
        var action = WizardNextActionStub.forValidationFailed();
        dataEntryState.handleNext(action, testContext);
        action.assert();

        dataEntryState = new StubbedDataEntryState([ValidationResult.successful('h')], formElementGroup, new Wizard(1, 1), [], workLists);
        action = WizardNextActionStub.forValidationFailed();
        dataEntryState.handleNext(action, testContext);
        action.assert();

        const obs = [Observation.create(concept, new PrimitiveValue(true))];
        dataEntryState = new StubbedDataEntryState([ValidationResult.successful('h')], formElementGroup, new Wizard(1, 1), obs, workLists);
        action = WizardNextActionStub.forCompleted();
        dataEntryState.handleNext(action, testContext);
        action.assert();
    });

    it('an Inference unavailable error on a top-level element survives the real Next lifecycle and blocks (#2008, finding 1)', () => {
        // Drives the REAL handleNext (not a hand-mocked handleValidationResult): _handleNextInternal1
        // runs formElementGroup.validate — which stamps the AI-verdict element success with `undefined`
        // — before the block check. The Inference error must dedup against that (undefined, not null)
        // and survive, or Next silently proceeds. Non-mandatory element so ONLY the Inference error can block.
        const concept = EntityFactory.createConcept('AI Verdict', Concept.dataType.Text);
        const formElement = EntityFactory.createFormElement('AI Verdict', false, concept);
        formElementGroup.addFormElement(formElement);
        const workLists = new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.ENCOUNTER, {
            subjectUUID: '100100100', encounterType: 'Foo',
        })]));

        let state = new StubbedDataEntryState([], formElementGroup, new Wizard(2, 1), [], workLists);
        state = ObservationsHolderActions.onInferenceUnavailable(state, {
            conceptName: 'AI Verdict', questionGroupConceptName: null, questionGroupIndex: null,
            messageKey: 'aiModelUnavailable',
        }, testContext);

        const action = WizardNextActionStub.forValidationFailed();
        state.handleNext(action, testContext);
        action.assert();   // block held: validationFailed, not movedNext
    });

    it('an Inference unavailable error survives page re-entry and still blocks (#2008, finding 3)', () => {
        // QA repro: raise the error, press PREVIOUS then NEXT, and the block is gone. Re-entering a
        // page runs updateFormElements -> getRuleValidationErrors, which emits a SUCCESS for every
        // element on it. handleValidationResult removed the Inference failure on that success, and
        // the per-image no-retry guard then suppressed re-raising it — so the worker reached
        // Referral Decision and was told "no suspicious lesions" for an unassessed image.
        const concept = EntityFactory.createConcept('AI Verdict', Concept.dataType.Text);
        const formElement = EntityFactory.createFormElement('AI Verdict', false, concept);
        formElementGroup.addFormElement(formElement);
        const workLists = new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.ENCOUNTER, {
            subjectUUID: '100100100', encounterType: 'Foo',
        })]));

        let state = new StubbedDataEntryState([], formElementGroup, new Wizard(2, 1), [], workLists);
        state = ObservationsHolderActions.onInferenceUnavailable(state, {
            conceptName: 'AI Verdict', questionGroupConceptName: null, questionGroupIndex: null,
            messageKey: 'aiModelUnavailable',
        }, testContext);
        expect(state.validationResults.length).to.equal(1);

        // Exactly what page re-entry does — a rule-cycle success for the same element.
        const statuses = [{uuid: formElement.uuid, validationErrors: [], questionGroupIndex: undefined}];
        state.handleValidationResults(ObservationsHolderActions.getRuleValidationErrors(statuses), testContext);

        expect(state.validationResults.length, 'a rule-cycle success must not wipe the Inference error').to.equal(1);
        expect(state.validationResults[0].validationType).to.equal(ValidationResult.ValidationTypes.Inference);

        const action = WizardNextActionStub.forValidationFailed();
        state.handleNext(action, testContext);
        action.assert();   // still blocked after re-entry
    });

    it('a later verdict still clears the Inference error (#2008)', () => {
        // The counterpart to the above: the error must not become unclearable. _clearInferenceValidation
        // is how a landed verdict removes it, and it must keep working.
        const concept = EntityFactory.createConcept('AI Verdict', Concept.dataType.Text);
        const formElement = EntityFactory.createFormElement('AI Verdict', false, concept);
        formElementGroup.addFormElement(formElement);
        const workLists = new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.ENCOUNTER, {
            subjectUUID: '100100100', encounterType: 'Foo',
        })]));

        let state = new StubbedDataEntryState([], formElementGroup, new Wizard(2, 1), [], workLists);
        state = ObservationsHolderActions.onInferenceUnavailable(state, {
            conceptName: 'AI Verdict', questionGroupConceptName: null, questionGroupIndex: null,
            messageKey: 'aiModelUnavailable',
        }, testContext);
        expect(state.validationResults.length).to.equal(1);

        ObservationsHolderActions._clearInferenceValidation(state, formElement.uuid, undefined);

        expect(state.validationResults.length, 'a landed verdict must clear the error').to.equal(0);
    });

    it('single select form element data entry', () => {
        const concept = EntityFactory.createConcept('c1', Concept.dataType.Coded);
        EntityFactory.addCodedAnswers(concept, ['a1', 'a2', 'a3']);
        const formElement = EntityFactory.createFormElement('bar', true, concept);
        formElementGroup.addFormElement(formElement);

        const workLists = new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.ENCOUNTER, {
            subjectUUID:'100100100',
            encounterType: 'Zoo',
        })]));

        var dataEntryState = new StubbedDataEntryState([], formElementGroup, new Wizard(1, 1), [], workLists);
        dataEntryState = ObservationsHolderActions.toggleSingleSelectAnswer(dataEntryState, {formElement: formElement, answerUUID: concept.getPossibleAnswerConcept('a1').uuid}, testContext)
        const observation = dataEntryState.observationsHolder.findObservation(concept);
        expect(observation.getValueWrapper().getConceptUUID()).is.equal(concept.getPossibleAnswerConcept('a1').uuid);
    });
});