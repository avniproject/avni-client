// Verifies CustomDashboardActions.onCardPress routes DueChecklist cards to ChecklistListingView.
// Checklist results are an object ({individual, checklistItemNames}) rather than a list, which is
// the shape ChecklistListingView expects, so they must not be treated as an unnavigable result.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {get: (klass) => map.get(klass.name)};
}

function buildContext(reportCard, result, status) {
    const ReportCardService = require("../../../src/service/customDashboard/ReportCardService").default;
    const EntityService = require("../../../src/service/EntityService").default;
    const CustomDashboardService = require("../../../src/service/customDashboard/CustomDashboardService").default;
    const DashboardFilterService = require("../../../src/service/reports/DashboardFilterService").default;
    return makeContext([
        [ReportCardService, {
            getPlainUUIDFromCompositeReportCardUUID: (x) => x,
            getReportCardResult: () => ({result, status}),
        }],
        [EntityService, {findByUUID: () => reportCard}],
        [CustomDashboardService, {getDashboardData: () => ({selectedFilterValues: {}})}],
        [DashboardFilterService, {toRuleInputObjects: () => []}],
    ]);
}

function makeChecklistReportCard() {
    return {
        name: "Due checklist",
        action: "ViewSubjectProfile",
        standardReportCardType: {
            type: "DueChecklist",
            name: "Due checklist",
            isApprovalType: () => false,
            isDefaultType: () => false,
            isCommentType: () => false,
            isTaskType: () => false,
            isChecklistType: () => true,
            getApprovalStatusForType: () => undefined,
        },
        isFullyCustom: () => false,
        isStandardTaskType: () => false,
        isActionDoVisit: () => false,
        isActionMarkAttendance: () => false,
    };
}

// The shape returned by IndividualService.dueChecklists.
function makeChecklistResult() {
    return {
        individual: [{individual: {uuid: "i1"}, visitInfo: {uuid: "i1", visitName: []}}],
        checklistItemNames: ["Vaccine A"],
    };
}

function makeAction() {
    return {
        reportCardUUID: "rc1",
        onShowSubjectAction: jest.fn(),
        onCustomRecordCardResults: jest.fn(),
        onDismissLoading: jest.fn(),
    };
}

describe("CustomDashboardActions.onCardPress DueChecklist card", () => {
    const state = {activeDashboardUUID: "d1", cardToCountResultMap: {}};

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("navigates to ChecklistListingView with the checklist result", () => {
        const reportCard = makeChecklistReportCard();
        const result = makeChecklistResult();
        const action = makeAction();
        CustomDashboardActions.onCardPress(state, action, buildContext(reportCard, result, "Due checklist"));
        jest.runAllTimers();
        assert.equal(action.onDismissLoading.mock.calls.length, 0,
            "must not silently dismiss the loader without navigating");
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
        const [passedResults, , viewName] = action.onCustomRecordCardResults.mock.calls[0];
        assert.equal(viewName, "ChecklistListingView");
        assert.deepEqual(passedResults, result);
    });

    it("does not short-circuit to a subject profile for a single due individual", () => {
        const reportCard = makeChecklistReportCard();
        const action = makeAction();
        CustomDashboardActions.onCardPress(state, action, buildContext(reportCard, makeChecklistResult(), "Due checklist"));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
    });
});
