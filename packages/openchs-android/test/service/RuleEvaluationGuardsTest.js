// Regression guards for RuleEvaluationService entry points that are called
// from auto-share / work-item-dispatch paths with no enclosing WorkLists.
// Prevents a recurrence of the NPE that swallowed every SHARE_SESSION
// failure-telemetry call (see code review #1).

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));

import RuleEvaluationService from "../../src/service/RuleEvaluationService";

function makeService() {
    const svc = new RuleEvaluationService({}, {beansMap: new Map()});
    svc.saveFailedRules = jest.fn();
    svc.findOnly = jest.fn(() => ({uuid: "org-1"}));  // OrganisationConfig stub
    return svc;
}

describe("RuleEvaluationService.getIndividualUUID — null safety", () => {
    it("returns null instead of NPEing when entity is null for a 'WorkList' lookup", () => {
        const svc = makeService();
        // Before the fix, this threw "Cannot read property 'getCurrentWorkItem' of null".
        assert.isNull(svc.getIndividualUUID(null, "WorkList"));
    });

    it("returns null for undefined entity regardless of entityName", () => {
        const svc = makeService();
        assert.isNull(svc.getIndividualUUID(undefined, "Individual"));
        assert.isNull(svc.getIndividualUUID(undefined, "ProgramEnrolment"));
        assert.isNull(svc.getIndividualUUID(undefined, "WorkList"));
    });

    it("still routes a valid entity through the per-type branch", () => {
        const svc = makeService();
        assert.equal(svc.getIndividualUUID({uuid: "ind-1"}, "Individual"), "ind-1");
    });
});

describe("RuleEvaluationService.recordWorkListUpdationFailure — null workLists path", () => {
    it("invokes saveFailedRules with a null individualUUID when workLists is null (SHARE_SESSION dispatcher path)", () => {
        const svc = makeService();
        const err = new Error("boom");
        const workItem = {id: "wi-1"};

        svc.recordWorkListUpdationFailure(err, null, {workItem});

        // Pre-fix: this NPE'd inside getIndividualUUID, the inner try/catch logged
        // 'Failed to record WorkListUpdation failure', and saveFailedRules NEVER ran.
        // Post-fix: saveFailedRules runs with individualUUID = null.
        assert.equal(svc.saveFailedRules.mock.calls.length, 1);
        const args = svc.saveFailedRules.mock.calls[0];
        // saveFailedRules(error, ruleUUID, individualUUID, ruleType, sourceUUID, entityType, entityUUID)
        assert.equal(args[0], err);
        assert.equal(args[2], null, "individualUUID derived from null workLists is null");
        assert.equal(args[3], "WorkListUpdation");
        assert.equal(args[5], "WorkList");
        assert.equal(args[6], "wi-1", "entityUUID falls back to workItem.id");
    });
});
