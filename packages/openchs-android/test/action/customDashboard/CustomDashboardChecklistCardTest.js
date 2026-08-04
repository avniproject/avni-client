// Verifies CustomDashboardActions.onCardPress routes DueChecklist cards to ChecklistListingView.
// Checklist results are an object ({individual, checklistItemNames}) rather than a list, which is
// the shape ChecklistListingView expects, so they must not be treated as an unnavigable result.

import {assert} from "chai";
import {Individual} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import {buildContext, cardPressState, makeAction, makeReportCard, makeStandardReportCardType} from "./CardPressTestFixture";

function makeChecklistReportCard() {
    return makeReportCard({
        name: "Due checklist",
        standardReportCardType: makeStandardReportCardType({
            type: "DueChecklist",
            name: "Due checklist",
            isChecklistType: () => true,
        }),
    });
}

// The shape returned by IndividualService.dueChecklists.
function makeChecklistResult() {
    const individual = Individual.createEmptyInstance();
    return {
        individual: [{individual, visitInfo: {uuid: individual.uuid, visitName: []}}],
        checklistItemNames: ["Vaccine A"],
    };
}

describe("CustomDashboardActions.onCardPress DueChecklist card", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("navigates to ChecklistListingView with the checklist result", () => {
        const result = makeChecklistResult();
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action, buildContext(makeChecklistReportCard(), result, "Due checklist"));
        jest.runAllTimers();
        assert.equal(action.onDismissLoading.mock.calls.length, 0,
            "must not silently dismiss the loader without navigating");
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 1);
        const [passedResults, , viewName] = action.onCustomRecordCardResults.mock.calls[0];
        assert.equal(viewName, "ChecklistListingView");
        assert.deepEqual(passedResults, result);
    });

    it("dismisses the loader when the checklist result is nil", () => {
        const action = makeAction();
        CustomDashboardActions.onCardPress(cardPressState, action, buildContext(makeChecklistReportCard(), null, "Due checklist"));
        jest.runAllTimers();
        assert.equal(action.onDismissLoading.mock.calls.length, 1);
        assert.equal(action.onCustomRecordCardResults.mock.calls.length, 0);
        assert.equal(action.onShowSubjectAction.mock.calls.length, 0);
    });
});
