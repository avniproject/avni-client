import {assert} from 'chai';
import {ApprovalStatus, EntityApprovalStatus, Individual, Observation} from 'avni-models';
import {ApprovalFormActions} from "../../src/action/approval/ApprovalFormActions";
import EntityApprovalStatusService from "../../src/service/EntityApprovalStatusService";
import General from "../../src/utility/General";

/**
 * avniproject/avni-client#2093 - reopening a decision that is already recorded, so the approver can
 * correct the answers they gave.
 *
 * The two things that separate a correction from a fresh decision are both here: the row it lands on, and
 * the answers it starts from. Getting the first wrong writes a second Approved row and re-dates the
 * approval; getting the second wrong either loses what was already answered or writes an abandoned edit
 * into the stored row, because Realm objects handed over rather than cloned are live.
 */
describe('ApprovalFormEdit', () => {

    function anAnswer(conceptUuid) {
        const observation = new Observation();
        observation.concept = {uuid: conceptUuid, name: 'Amount approved'};
        observation.valueJSON = JSON.stringify({answer: 4000});
        return observation;
    }

    function context() {
        return {
            get: (type) => type === EntityApprovalStatusService
                ? {getEntityTypeForSchema: () => EntityApprovalStatus.entityType.Subject}
                : {}
        };
    }

    function aRecordedDecision(answers) {
        const decision = new EntityApprovalStatus();
        decision.uuid = 'recorded-decision-uuid';
        decision.entityUUID = 'entity-uuid';
        decision.entityType = EntityApprovalStatus.entityType.Subject;
        decision.statusDateTime = new Date('2026-08-01T09:00:00.000Z');
        decision.observations = answers;
        return decision;
    }

    const anAction = (existingDecision) => ({
        entity: {uuid: 'entity-uuid'},
        schema: Individual.schema.name,
        status: ApprovalStatus.statuses.Approved,
        existingDecision
    });

    it('reopens the recorded decision rather than starting a new one', () => {
        const recorded = aRecordedDecision([anAnswer('concept-1')]);

        const working = ApprovalFormActions.workingDecisionFor(anAction(recorded), context());

        assert.equal('recorded-decision-uuid', working.uuid,
            'a correction must land on the row being corrected, not add a second decision');
        assert.equal(recorded.statusDateTime.getTime(), working.statusDateTime.getTime(),
            'correcting an answer does not re-date the approval');
    });

    it('starts a decision that is being made fresh', () => {
        const working = ApprovalFormActions.workingDecisionFor(anAction(undefined), context());

        assert.notEqual('recorded-decision-uuid', working.uuid);
        assert.equal(0, working.observations.length);
        assert.equal(EntityApprovalStatus.entityType.Subject, working.entityType);
    });

    it('opens the form on the answers already recorded', () => {
        const recorded = aRecordedDecision([anAnswer('concept-1'), anAnswer('concept-2')]);

        const working = ApprovalFormActions.workingDecisionFor(anAction(recorded), context());

        assert.equal(2, working.observations.length, 'the approver must see what they answered before');
    });

    /**
     * The stored answers are live Realm objects. Handing them over would make every keystroke a write
     * outside a transaction, and would leave an abandoned edit in the stored row.
     */
    it('copies the answers rather than handing over the stored ones', () => {
        const recorded = aRecordedDecision([anAnswer('concept-1')]);

        const working = ApprovalFormActions.workingDecisionFor(anAction(recorded), context());

        assert.notStrictEqual(recorded.observations[0], working.observations[0],
            'editing must not write through to the stored decision');
        assert.equal('concept-1', working.observations[0].concept.uuid);
    });

    // Opening at the page an Edit link named

    function aStateOnPage(currentPage) {
        return {wizard: {currentPage}, anyFailedResultForCurrentFEG: () => false};
    }

    it('stays put when no page was named', () => {
        const state = aStateOnPage(1);

        assert.strictEqual(state, ApprovalFormActions.moveToNamedPage(state, {}, context()));
    });

    /**
     * This form opens at the first page carrying a visible question, which is not always page one - so it
     * can already be past the page the Edit link named. Walking on "currentPage !== target" would never
     * terminate there, which on a device is a frozen screen rather than a wrong answer.
     */
    it('does not walk when it already opened past the page named', () => {
        const state = aStateOnPage(3);
        const originalOnNext = ApprovalFormActions.onNext;
        let steps = 0;
        ApprovalFormActions.onNext = (s) => {
            steps++;
            return s;
        };

        try {
            ApprovalFormActions.moveToNamedPage(state, {pageNumber: 2}, context());
        } finally {
            ApprovalFormActions.onNext = originalOnNext;
        }

        assert.equal(0, steps, 'walking forward towards a page already behind it would never end');
    });

    it('walks forward one page at a time to the page named', () => {
        const originalOnNext = ApprovalFormActions.onNext;
        ApprovalFormActions.onNext = (s) => aStateOnPage(s.wizard.currentPage + 1);

        let reached;
        try {
            reached = ApprovalFormActions.moveToNamedPage(aStateOnPage(1), {pageNumber: 3}, context());
        } finally {
            ApprovalFormActions.onNext = originalOnNext;
        }

        assert.equal(3, reached.wizard.currentPage);
    });

    it('gives up rather than looping when a step fails to advance', () => {
        const originalOnNext = ApprovalFormActions.onNext;
        let steps = 0;
        ApprovalFormActions.onNext = (s) => {
            steps++;
            return s;
        };

        try {
            ApprovalFormActions.moveToNamedPage(aStateOnPage(1), {pageNumber: 4}, context());
        } finally {
            ApprovalFormActions.onNext = originalOnNext;
        }

        assert.equal(1, steps, 'a page that will not advance must stop the walk, not spin on it');
    });
});
