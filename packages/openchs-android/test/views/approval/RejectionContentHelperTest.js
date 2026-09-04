import {assert} from "chai";
import RejectionContentHelper from "../../../src/views/approval/RejectionContentHelper";

/**
 * avniproject/avni-client#2093 - which of the two reasons a rejection shows.
 *
 * The decision is made per row and reads only that row. It must never consult whether a form is attached
 * right now: an organisation that attaches a rejection form in March still holds February's rejections as
 * typed text, and those have to render as text forever, not just during changeover.
 */
describe('RejectionContentHelper', () => {

    function aStatus({rejected = true, comment = null, observations = []} = {}) {
        return {
            approvalStatus: {isRejected: rejected},
            approvalStatusComment: comment,
            observations
        };
    }

    const anAnswer = {concept: {uuid: 'concept-1', name: 'Rejection reason'}, valueJSON: '{}'};

    // What gets rendered at all

    it('renders for a rejection', () => {
        assert.isTrue(RejectionContentHelper.shouldRender(aStatus({comment: 'Address did not match'})));
    });

    it('renders nothing for an approval', () => {
        assert.isFalse(RejectionContentHelper.shouldRender(aStatus({rejected: false, comment: 'anything'})));
    });

    /**
     * AC #5 - approvals show nothing new anywhere. An approval carrying answers, which is possible once an
     * organisation attaches an approval form, must still render nothing.
     */
    it('renders nothing for an approval that carries answers', () => {
        assert.isFalse(RejectionContentHelper.shouldRender(
            aStatus({rejected: false, observations: [anAnswer]})));
    });

    it('renders nothing when there is no decision at all', () => {
        assert.isFalse(RejectionContentHelper.shouldRender(null));
        assert.isFalse(RejectionContentHelper.shouldRender(undefined));
    });

    // Which of the two reasons

    it('shows answers when the rejection carries them', () => {
        assert.isTrue(RejectionContentHelper.hasAnswers(aStatus({observations: [anAnswer]})));
    });

    it('shows the typed reason when the rejection has no answers', () => {
        assert.isFalse(RejectionContentHelper.hasAnswers(aStatus({comment: 'Address did not match'})));
    });

    /**
     * An empty list is not "answers". Treating it as answers would render an empty panel where the typed
     * reason should be - worse than the old behaviour, and silent.
     */
    it('falls back to the typed reason when the answer list is empty', () => {
        assert.isFalse(RejectionContentHelper.hasAnswers(aStatus({comment: 'a reason', observations: []})));
    });

    it('falls back to the typed reason when observations are absent entirely', () => {
        assert.isFalse(RejectionContentHelper.hasAnswers(
            {approvalStatus: {isRejected: true}, approvalStatusComment: 'a reason'}));
    });

    it('does not throw on a missing decision', () => {
        assert.isFalse(RejectionContentHelper.hasAnswers(null));
    });

    /**
     * The case the story calls the most important test data, and the one neither branch alone proves: one
     * record holding an older comment-only rejection and a newer one with answers. Each row decides for
     * itself, so the same entity renders text in one place and answers in another.
     */
    it('decides per row on a record holding both kinds of rejection', () => {
        const februaryRejection = aStatus({comment: 'Address did not match'});
        const marchRejection = aStatus({observations: [anAnswer]});

        assert.isTrue(RejectionContentHelper.shouldRender(februaryRejection));
        assert.isFalse(RejectionContentHelper.hasAnswers(februaryRejection),
            'a rejection recorded before the form was attached must keep showing its typed reason');

        assert.isTrue(RejectionContentHelper.shouldRender(marchRejection));
        assert.isTrue(RejectionContentHelper.hasAnswers(marchRejection));
    });
});
