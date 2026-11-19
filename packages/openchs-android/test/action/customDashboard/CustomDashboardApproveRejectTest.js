// Uses a real ReportCard, so it also covers how the phone reads the action and state the server sends.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import {Individual, ReportCard} from "openchs-models";
import {buildContext, cardPressState, makeAction} from "./CardPressTestFixture";

jest.useFakeTimers();

function customQueryCard(action, actionDetail) {
    return ReportCard.fromResource({
        uuid: "rc1",
        name: "My approvals",
        colour: "#fff",
        voided: false,
        query: "'use strict'; ({params}) => []",
        standardReportCardInputSubjectTypes: [],
        standardReportCardInputPrograms: [],
        standardReportCardInputEncounterTypes: [],
        action,
        actionDetail,
        _links: {},
    }, {findByKey: () => null, findByUUID: () => null});
}

function subject(uuid) {
    const individual = Individual.createEmptyInstance();
    individual.uuid = uuid;
    return individual;
}

// Taps the card with the given query result and returns what the screen was asked to open.
function tap(reportCard, result) {
    const action = makeAction();
    CustomDashboardActions.onCardPress(cardPressState, action, buildContext(reportCard, result));
    jest.runAllTimers();
    const [opened] = action.onCustomRecordCardResults.mock.calls;
    return {
        action,
        viewName: opened && opened[2],
        approvalStatus: opened && opened[3],
        results: opened && opened[0],
        reportCardPassed: opened && opened[5],
    };
}

describe("CustomDashboardActions.onCardPress Approve or Reject on a custom query card", () => {
    it.each(["Pending", "Approved", "Rejected"])("opens the approval list for the %s state set on the card", (status) => {
        const card = customQueryCard("ApproveReject", {approvalStatus: status});
        const subjects = [subject("s1"), subject("s2")];

        const opened = tap(card, subjects);

        assert.equal(opened.viewName, "ApprovalListingView");
        assert.equal(opened.approvalStatus, status);
        assert.strictEqual(opened.results, subjects);
        assert.strictEqual(opened.reportCardPassed, card);
    });

    it("opens the approval list, not the subject's profile, when the query returns one subject", () => {
        const opened = tap(customQueryCard("ApproveReject", {approvalStatus: "Pending"}), [subject("s1")]);

        assert.equal(opened.action.onShowSubjectAction.mock.calls.length, 0);
        assert.equal(opened.viewName, "ApprovalListingView");
    });

    it("opens the approval list with no subjects when the query returns none", () => {
        const opened = tap(customQueryCard("ApproveReject", {approvalStatus: "Pending"}), []);

        assert.equal(opened.viewName, "ApprovalListingView");
        assert.deepEqual(opened.results, []);
        assert.equal(opened.action.onDismissLoading.mock.calls.length, 0);
    });

    it("opens the ordinary list, as before the action existed, for an Approve or Reject card with no state", () => {
        const opened = tap(customQueryCard("ApproveReject", {}), [subject("s1"), subject("s2")]);

        assert.equal(opened.viewName, "IndividualSearchResultPaginatedView");
        assert.isNull(opened.approvalStatus);
    });

    it("still takes the single-subject shortcut for an Approve or Reject card with no state", () => {
        const opened = tap(customQueryCard("ApproveReject", {}), [subject("s1")]);

        assert.equal(opened.action.onShowSubjectAction.mock.calls.length, 1);
    });

    it("leaves a View subject profile card on the ordinary list, whatever state its action detail carries", () => {
        const opened = tap(customQueryCard("ViewSubjectProfile", {approvalStatus: "Pending"}), [subject("s1"), subject("s2")]);

        assert.equal(opened.viewName, "IndividualSearchResultPaginatedView");
        assert.isNull(opened.approvalStatus);
    });

    it("does nothing but dismiss the loader when the card's query failed, like any custom card", () => {
        const opened = tap(customQueryCard("ApproveReject", {approvalStatus: "Pending"}), null);

        assert.equal(opened.action.onCustomRecordCardResults.mock.calls.length, 0);
        assert.equal(opened.action.onShowSubjectAction.mock.calls.length, 0);
        assert.equal(opened.action.onDismissLoading.mock.calls.length, 1);
    });
});
