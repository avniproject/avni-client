// Verifies CustomDashboardActions.onCardPress routes Comments cards to CommentListView
// regardless of thread count. Comment results carry `subject`, not `individual`, so the
// single-subject short-circuit would otherwise navigate using a Comment's uuid.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {get: (klass) => map.get(klass.name)};
}

function buildContext(reportCard, result) {
    const ReportCardService = require("../../../src/service/customDashboard/ReportCardService").default;
    const EntityService = require("../../../src/service/EntityService").default;
    const CustomDashboardService = require("../../../src/service/customDashboard/CustomDashboardService").default;
    const DashboardFilterService = require("../../../src/service/reports/DashboardFilterService").default;
    return makeContext([
        [ReportCardService, {
            getPlainUUIDFromCompositeReportCardUUID: (x) => x,
            getReportCardResult: () => ({result, status: null}),
        }],
        [EntityService, {findByUUID: () => reportCard}],
        [CustomDashboardService, {getDashboardData: () => ({selectedFilterValues: {}})}],
        [DashboardFilterService, {toRuleInputObjects: () => []}],
    ]);
}

function makeCommentsReportCard() {
    return {
        name: "Comments",
        action: "ViewSubjectProfile",
        standardReportCardType: {
            type: "Comments",
            isApprovalType: () => false,
            isDefaultType: () => false,
            isCommentType: () => true,
            isTaskType: () => false,
            isChecklistType: () => false,
            getApprovalStatusForType: () => undefined,
        },
        isFullyCustom: () => false,
        isStandardTaskType: () => false,
        isActionDoVisit: () => false,
        isActionMarkAttendance: () => false,
    };
}

// A Comment entity as returned by CommentService.getAllOpenCommentThreads: it has a
// `subject` link but no `individual`, and its own uuid is not an Individual's uuid.
function makeComment(uuid, subjectUUID) {
    return {uuid, text: "test", subject: {uuid: subjectUUID}, commentThread: {uuid: `${uuid}-thread`}};
}

function makeAction() {
    return {
        reportCardUUID: "rc1",
        onShowSubjectAction: jest.fn(),
        onCustomRecordCardResults: jest.fn(),
        onDismissLoading: jest.fn(),
    };
}

describe("CustomDashboardActions.onCardPress Comments card", () => {
    const state = {activeDashboardUUID: "d1", cardToCountResultMap: {}};

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("opens CommentListView for a single open comment thread", () => {
        const reportCard = makeCommentsReportCard();
        const result = [makeComment("c1", "s1")];
        const action = makeAction();
        CustomDashboardActions.onCardPress(state, action, buildContext(reportCard, result));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0,
            "must not navigate to the subject dashboard using a Comment's uuid");
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
        assert.equal(action.onCustomRecordCardResults.mock.calls[0][2], "CommentListView");
    });

    it("opens CommentListView for multiple open comment threads", () => {
        const reportCard = makeCommentsReportCard();
        const result = [makeComment("c1", "s1"), makeComment("c2", "s2")];
        const action = makeAction();
        CustomDashboardActions.onCardPress(state, action, buildContext(reportCard, result));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
        assert.equal(action.onCustomRecordCardResults.mock.calls[0][2], "CommentListView");
    });
});
