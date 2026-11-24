// Verifies CustomDashboardActions.onCardPress routes Comments cards to CommentListView
// regardless of thread count. Comment results carry `subject`, not `individual`, so the
// single-subject short-circuit would otherwise navigate using a Comment's uuid.

import {assert} from "chai";
import {Comment} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import {buildContext, cardPressState, makeAction, makeReportCard, makeStandardReportCardType} from "./CardPressTestFixture";

function makeCommentsReportCard() {
    return makeReportCard({
        name: "Comments",
        standardReportCardType: makeStandardReportCardType({type: "Comments", isCommentType: () => true}),
    });
}

// A Comment entity as returned by CommentService.getAllOpenCommentThreads: it has a
// `subject` link but no `individual`, and its own uuid is not an Individual's uuid.
function makeComment(uuid, subjectUUID) {
    const comment = Comment.createEmptyInstance(uuid);
    comment.text = "test";
    comment.subject.uuid = subjectUUID;
    return comment;
}

describe("CustomDashboardActions.onCardPress Comments card", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("opens CommentListView for a single open comment thread", () => {
        const result = [makeComment("c1", "s1")];
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action, buildContext(makeCommentsReportCard(), result));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0,
            "must not navigate to the subject dashboard using a Comment's uuid");
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
        assert.equal(action.onCustomRecordCardResults.mock.calls[0][2], "CommentListView");
    });

    it("opens CommentListView for multiple open comment threads", () => {
        const result = [makeComment("c1", "s1"), makeComment("c2", "s2")];
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action, buildContext(makeCommentsReportCard(), result));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
        assert.equal(action.onCustomRecordCardResults.mock.calls[0][2], "CommentListView");
    });
});
