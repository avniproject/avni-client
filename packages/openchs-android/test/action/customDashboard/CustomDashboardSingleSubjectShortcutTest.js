// The single-result short-circuit deep-links to SubjectDashboardView, which crashes on a
// uuid that isn't a subject's. Guard is an allowlist: only take it when the row really is
// an Individual — a uuid-bearing row of any other kind must fall through to the list view.

import {assert} from "chai";
import {Individual} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import {buildContext, cardPressState, makeAction, makeReportCard, makeStandardReportCardType} from "./CardPressTestFixture";

describe("CustomDashboardActions.onCardPress single-subject shortcut", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("takes the shortcut for a bare Individual", () => {
        const individual = Individual.createEmptyInstance();
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action, buildContext(makeReportCard({}), [individual]));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 1);
        assert.equal(action.onShowSubjectAction.mock.calls[0][0].uuid, individual.uuid);
    });

    it("takes the shortcut for an Individual wrapped with visitInfo", () => {
        const individual = Individual.createEmptyInstance();
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action,
            buildContext(makeReportCard({standardReportCardType: makeStandardReportCardType({type: "ScheduledVisits", isDefaultType: () => true})}),
                [{individual, visitInfo: {uuid: individual.uuid, visitName: []}}]));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 1);
        assert.equal(action.onShowSubjectAction.mock.calls[0][0].uuid, individual.uuid);
    });

    it("opens the list when the single row carries a uuid but is not a subject", () => {
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action,
            buildContext(makeReportCard({}), [{uuid: "not-a-subject-uuid", name: "some custom query row"}]));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0,
            "must not deep-link SubjectDashboardView with a non-subject uuid");
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
    });

    it("does not take the shortcut for approval cards", () => {
        const individual = Individual.createEmptyInstance();
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action,
            buildContext(makeReportCard({standardReportCardType: makeStandardReportCardType({type: "PendingApproval", isApprovalType: () => true})}),
                [individual]));
        jest.runAllTimers();
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
        assert.equal(action.onCustomRecordCardResults.mock.calls[0][2], "ApprovalListingView");
    });
});
