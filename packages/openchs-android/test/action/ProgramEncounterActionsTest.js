import {expect} from "chai";
import {Concept, FormElement, Individual, WorkItem, WorkList, WorkLists} from 'avni-models';
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
});
