// Verifies CustomDashboardActions.onCardPress routes MarkAttendance cards to the
// group-subject list (never the single-subject short-circuit), so the deep-link
// always carries a chosen group subject — unlike ViewSubjectProfile cards which
// jump straight to a lone subject's dashboard.

import {assert} from "chai";
import {Individual} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import {buildContext, cardPressState, makeAction, makeReportCard} from "./CardPressTestFixture";

function makeAttendanceReportCard({markAttendance}) {
    return makeReportCard({
        action: markAttendance ? "MarkAttendance" : "ViewSubjectProfile",
        isActionMarkAttendance: () => markAttendance,
    });
}

function makeGroupSubject(uuid) {
    const individual = Individual.createEmptyInstance();
    individual.uuid = uuid;
    individual.subjectType.attendanceEnabled = true;
    return individual;
}

describe("CustomDashboardActions.onCardPress MarkAttendance", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("opens the group-subject list even for a single result", () => {
        const reportCard = makeAttendanceReportCard({markAttendance: true});
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action, buildContext(reportCard, [makeGroupSubject("gs1")], "result"));
        jest.runAllTimers();
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
    });

    it("still short-circuits a single result to the subject dashboard for non-attendance cards", () => {
        const reportCard = makeAttendanceReportCard({markAttendance: false});
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action, buildContext(reportCard, [makeGroupSubject("gs1")], "result"));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 1);
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 0);
    });
});
