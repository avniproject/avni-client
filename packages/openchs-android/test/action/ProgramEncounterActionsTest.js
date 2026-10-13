import {expect} from "chai";
import {Concept, FormElement, Individual, Observation, PrimitiveValue, WorkItem, WorkList, WorkLists} from 'avni-models';
import {ProgramEncounterActions} from "../../src/action/program/ProgramEncounterActions";
import ObservationsHolderActions from "../../src/action/common/ObservationsHolderActions";
import ProgramEncounterState from "../../src/state/ProgramEncounterState";
import WorkListState from "../../src/state/WorkListState";
import Wizard from "../../src/state/Wizard";
import EntityFactory from "../EntityFactory";
import TestContext from "./views/testframework/TestContext";

const createFormElement = function (dataType, mandatory, conceptUUID) {
    const formElement = new FormElement();
    formElement.uuid = 'be5b6739-e812-4be5-b0f4-7c5865889883';
    formElement.mandatory = mandatory;
    const concept = EntityFactory.createConcept('', dataType);
    concept.uuid = conceptUUID;
    formElement.concept = concept;
    return formElement;
};

const createInitialState = function () {
    const form = EntityFactory.createForm();
    const formElementGroup = EntityFactory.createFormElementGroup('FooConcept', 1, form);
    const formElement = createFormElement(Concept.dataType.Numeric, true, 'bfc28bad-5fac-4760-921d-eec83f52c3da');
    formElementGroup.addFormElement(formElement);
    const formElementGroup2 = EntityFactory.createFormElementGroup('Bar', 2, form);
    formElementGroup2.addFormElement(createFormElement(Concept.dataType.Numeric, false, 'd1ab1bfd-aa13-4e86-ac67-9b46387ee446'));

    const programEnrolment = EntityFactory.createEnrolment({
        individual: Individual.createEmptyInstance(),
        program: EntityFactory.createProgram({name: 'ZeeProgram'})
    });
    const programEncounter = EntityFactory.createProgramEncounter({programEnrolment, encounterType: 'ZeeType'});
    const state = new ProgramEncounterState(formElementGroup, new Wizard(2, 1), false, programEncounter, formElementGroup.getFormElements());
    state.getNextScheduledVisits = () => ({});
    state.workListState = new WorkListState(new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.PROGRAM_ENCOUNTER, {
        subjectUUID: programEnrolment.individual.uuid,
        encounterType: programEncounter.encounterType.name,
    })])), () => ({}));
    return {state, formElement};
};

describe('ProgramEncounterActionsTest', () => {
    let testContext;

    beforeEach(function () {
        testContext = new TestContext();
    });

    it('immutable repeat visit opens the summary once, not in a loop (issue #2184)', async () => {
        const {state, formElement} = createInitialState();
        const filled = ObservationsHolderActions.onPrimitiveObsUpdateValue(state, {value: '10', formElement: formElement}, testContext);
        filled.allElementsFilledForImmutableEncounter = true;

        // Stands in for ProgramEncounterView: after every state change, componentDidUpdate dispatches
        // SUMMARY_PAGE while the encounter is immutable and fully filled and no completion is running.
        // Capped so a regression fails the test instead of hanging it.
        const MAX_COMPLETIONS = 5;
        let completedCount = 0;
        let current;
        const action = {
            completed: () => { completedCount++; },
            settleCompletion: (settled) => onStateChange(ProgramEncounterActions.onUseThisState(current, {state: settled}, testContext)),
            movedNext: () => {}
        };
        const onStateChange = (newState) => {
            current = newState;
            if (completedCount < MAX_COMPLETIONS && newState.allElementsFilledForImmutableEncounter && !newState.wizardCompletionInProgress) {
                onStateChange(ProgramEncounterActions.onSummaryPage(newState, action, testContext));
            }
        };

        onStateChange(filled);
        for (let i = 0; i < 200 && completedCount < MAX_COMPLETIONS; i++) {
            await new Promise(resolve => setImmediate(resolve));
        }

        expect(completedCount).is.equal(1);
        expect(current.wizardCompletionInProgress).is.equal(false);
    });

    it('Back from the summary of an immutable repeat visit goes back one page at a time (issue #2184)', async () => {
        const form = EntityFactory.createForm('ZeeForm');
        const page1 = EntityFactory.createFormElementGroup('Vitals', 1, form);
        page1.addFormElement(createFormElement(Concept.dataType.Numeric, true, 'bfc28bad-5fac-4760-921d-eec83f52c3da'));
        const page2 = EntityFactory.createFormElementGroup('Notes', 2, form);
        const page2Element = createFormElement(Concept.dataType.Numeric, true, 'd1ab1bfd-aa13-4e86-ac67-9b46387ee446');
        page2Element.uuid = '0f7c0e47-0f7e-4c6a-9d07-5b1d1c0f1e2a';
        page2.addFormElement(page2Element);

        const programEnrolment = EntityFactory.createEnrolment({
            individual: Individual.createEmptyInstance(),
            program: EntityFactory.createProgram({name: 'ZeeProgram'})
        });
        const previous = EntityFactory.createProgramEncounter({
            programEnrolment,
            encounterType: 'ZeeType',
            encounterDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            observations: [page1, page2].map((page) => Observation.create(page.getFormElements()[0].concept, new PrimitiveValue(10, Concept.dataType.Numeric)))
        });
        programEnrolment.encounters = [previous];
        const programEncounter = EntityFactory.createProgramEncounter({programEnrolment, encounterType: 'ZeeType'});
        programEncounter.encounterType.immutable = true;

        testContext = new TestContext({form});
        const loaded = ProgramEncounterActions.onLoad(ProgramEncounterActions.getInitialState(), {programEncounter}, testContext);
        expect(loaded.allElementsFilledForImmutableEncounter).is.equal(true);
        loaded.getNextScheduledVisits = () => ({});

        // Stands in for ProgramEncounterView, as in the test above.
        let completedCount = 0;
        let current;
        const action = {
            completed: () => { completedCount++; },
            settleCompletion: (settled) => onStateChange(ProgramEncounterActions.onUseThisState(current, {state: settled}, testContext)),
            movedNext: () => {}
        };
        const onStateChange = (newState) => {
            current = newState;
            if (completedCount < 5 && newState.allElementsFilledForImmutableEncounter && !newState.wizardCompletionInProgress) {
                onStateChange(ProgramEncounterActions.onSummaryPage(newState, action, testContext));
            }
        };
        onStateChange(loaded);
        for (let i = 0; i < 200 && (completedCount === 0 || current.wizardCompletionInProgress); i++) {
            await new Promise(resolve => setImmediate(resolve));
        }
        expect(completedCount).is.equal(1);

        // Phone Back closes the summary and returns to the form in this state.
        expect(current.wizard.currentPage).is.equal(2);
        expect(current.formElementGroup.name).is.equal('Notes');

        const back = ProgramEncounterActions.onPrevious(current, {}, testContext);
        expect(back.formElementGroup.name).is.equal('Vitals');
        expect(back.wizard.isFirstPage()).is.equal(true);
    });
});
