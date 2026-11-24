import {assert} from "chai";
import DecisionContentHelper from "../../../src/views/approval/DecisionContentHelper";

/**
 * avniproject/avni-client#2093 - what a recorded decision shows.
 *
 * The decision is made per row and reads only that row. It must never consult whether a form is attached
 * right now: an organisation that attaches a rejection form in March still holds February's rejections as
 * typed text, and those have to render as text forever, not just during changeover.
 */
describe('DecisionContentHelper', () => {

    function aStatus({rejected = true, comment = null, observations = []} = {}) {
        return {
            approvalStatus: {isRejected: rejected, isApproved: !rejected},
            approvalStatusComment: comment,
            observations
        };
    }

    const anAnswer = {concept: {uuid: 'concept-1', name: 'Rejection reason'}, valueJSON: '{}'};

    // What gets rendered at all

    it('renders for a rejection', () => {
        assert.isTrue(DecisionContentHelper.shouldRender(aStatus({comment: 'Address did not match'})));
    });

    /**
     * An approval that carries answers shows them, the same way a rejection does. Approvals showed nothing
     * while there was nothing on them to show; once an organisation attaches an Approval form, what the
     * approver recorded is as much a part of the record as a rejection reason.
     */
    it('renders an approval that carries answers', () => {
        assert.isTrue(DecisionContentHelper.shouldRender(
            aStatus({rejected: false, observations: [anAnswer]})));
    });

    /**
     * An approval with no answers has nothing to show, and every approved record in an organisation with
     * no Approval form is one - an empty panel on all of them would be worse than no panel.
     */
    it('renders nothing for an approval with no answers', () => {
        assert.isFalse(DecisionContentHelper.shouldRender(aStatus({rejected: false, comment: 'anything'})));
    });

    it('renders nothing when there is no decision at all', () => {
        assert.isFalse(DecisionContentHelper.shouldRender(null));
        assert.isFalse(DecisionContentHelper.shouldRender(undefined));
    });

    it('renders nothing for a record still waiting for a decision', () => {
        assert.isFalse(DecisionContentHelper.shouldRender(
            {approvalStatus: {isRejected: false, isApproved: false, isPending: true}, observations: [anAnswer]}));
    });

    // Which heading goes over the answers

    it('calls an approval an approval and a rejection a rejection', () => {
        assert.equal('approvalNote', DecisionContentHelper.headerKey(aStatus({rejected: false, observations: [anAnswer]})));
        assert.equal('rejectionNote', DecisionContentHelper.headerKey(aStatus({observations: [anAnswer]})));
    });

    // Which of the two reasons

    it('shows answers when the rejection carries them', () => {
        assert.isTrue(DecisionContentHelper.hasAnswers(aStatus({observations: [anAnswer]})));
    });

    it('shows the typed reason when the rejection has no answers', () => {
        assert.isFalse(DecisionContentHelper.hasAnswers(aStatus({comment: 'Address did not match'})));
    });

    /**
     * An empty list is not "answers". Treating it as answers would render an empty panel where the typed
     * reason should be - worse than the old behaviour, and silent.
     */
    it('falls back to the typed reason when the answer list is empty', () => {
        assert.isFalse(DecisionContentHelper.hasAnswers(aStatus({comment: 'a reason', observations: []})));
    });

    it('falls back to the typed reason when observations are absent entirely', () => {
        assert.isFalse(DecisionContentHelper.hasAnswers(
            {approvalStatus: {isRejected: true}, approvalStatusComment: 'a reason'}));
    });

    it('does not throw on a missing decision', () => {
        assert.isFalse(DecisionContentHelper.hasAnswers(null));
    });

    /**
     * The case the story calls the most important test data, and the one neither branch alone proves: one
     * record holding an older comment-only rejection and a newer one with answers. Each row decides for
     * itself, so the same entity renders text in one place and answers in another.
     */
    it('decides per row on a record holding both kinds of rejection', () => {
        const februaryRejection = aStatus({comment: 'Address did not match'});
        const marchRejection = aStatus({observations: [anAnswer]});

        assert.isTrue(DecisionContentHelper.shouldRender(februaryRejection));
        assert.isFalse(DecisionContentHelper.hasAnswers(februaryRejection),
            'a rejection recorded before the form was attached must keep showing its typed reason');

        assert.isTrue(DecisionContentHelper.shouldRender(marchRejection));
        assert.isTrue(DecisionContentHelper.hasAnswers(marchRejection));
    });
});
