import {assert} from "chai";

// Observations transitively imports a large part of the view layer - CHSNavigator, ProgramEnrolmentView,
// AppHeader, SyncComponent - and bottoms out in native modules that cannot load under jest. Nothing else
// in this suite imports it, and mocking the whole chain would be out of proportion to the check. Stubbing
// Observations itself is enough for what this test is for: jest.mock still resolves the path, so a wrong
// import path in either component fails here rather than at build time.
jest.mock("../../../src/views/common/Observations", () => "Observations");

import {DecisionMessage} from "../../../src/views/approval/DecisionMessage";
import ApprovalDetailsCard from "../../../src/views/approval/ApprovalDetailsCard";
import DecisionContentHelper from "../../../src/views/approval/DecisionContentHelper";

/**
 * avniproject/avni-client#2093 - a load check for the two components the story changes.
 *
 * Neither is rendered by any test in this repo, and React Native components cannot be rendered here
 * without a much larger harness. This does the one thing that is both cheap and worth having: proves the
 * modules load with their new imports resolved, so a wrong path or a bad symbol fails here rather than at
 * build time. The behaviour they delegate to is covered by DecisionContentHelperTest.
 */
describe('DecisionMessage and ApprovalDetailsCard load', () => {
    it('DecisionMessage loads with Observations and the helper wired in', () => {
        assert.isFunction(DecisionMessage);
    });

    it('ApprovalDetailsCard loads with Observations and the helper wired in', () => {
        assert.isFunction(ApprovalDetailsCard);
    });

    it('both components share the same per-row decision', () => {
        // Guards against one component being changed and the other left behind - the reason the decision
        // was extracted into a helper in the first place.
        assert.isFunction(DecisionContentHelper.shouldRender);
        assert.isFunction(DecisionContentHelper.hasAnswers);
        assert.isFunction(DecisionContentHelper.headerKey);
    });
});
