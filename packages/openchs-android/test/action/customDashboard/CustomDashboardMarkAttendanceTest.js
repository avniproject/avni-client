// Verifies CustomDashboardActions.onCardPress routes MarkAttendance cards to the
// group-subject list (never the single-subject short-circuit), so the deep-link
// always carries a chosen group subject — unlike ViewSubjectProfile cards which
// jump straight to a lone subject's dashboard.

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
            getReportCardResult: () => ({result, status: "result"}),
        }],
        [EntityService, {findByUUID: () => reportCard}],
        [CustomDashboardService, {getDashboardData: () => ({selectedFilterValues: {}})}],
        [DashboardFilterService, {toRuleInputObjects: () => []}],
    ]);
}

function makeReportCard({markAttendance}) {
    return {
        name: "Card",
        action: markAttendance ? "MarkAttendance" : "ViewSubjectProfile",
        standardReportCardType: null,
        isFullyCustom: () => false,
        isStandardTaskType: () => false,
        isActionDoVisit: () => false,
        isActionMarkAttendance: () => markAttendance,
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

describe("CustomDashboardActions.onCardPress MarkAttendance", () => {
    const state = {activeDashboardUUID: "d1", cardToCountResultMap: {}};

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("opens the group-subject list even for a single result", () => {
        const reportCard = makeReportCard({markAttendance: true});
        const result = [{uuid: "gs1", subjectType: {uuid: "st1", attendanceEnabled: true}}];
        const action = makeAction();
        CustomDashboardActions.onCardPress(state, action, buildContext(reportCard, result));
        jest.runAllTimers();
        assert.isTrue(action.onCustomRecordCardResults.called || action.onCustomRecordCardResults.mock.calls.length > 0);
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
    });

    it("still short-circuits a single result to the subject dashboard for non-attendance cards", () => {
        const reportCard = makeReportCard({markAttendance: false});
        const result = [{uuid: "gs1"}];
        const action = makeAction();
        CustomDashboardActions.onCardPress(state, action, buildContext(reportCard, result));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 1);
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 0);
    });
});
