// A guided-camera photo row must never silently vanish when its rule misbehaves. These pin the two
// ways that used to happen: a Promise-returning rule (whose result carries no uuid, so
// FormElementGroup.filterElements can never match it back) and a throwing rule (which returned
// null and left the element with no status at all).

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));

import RuleEvaluationService from "../../src/service/RuleEvaluationService";
import General from "../../src/utility/General";

const PROMISE_RULE = "({params}) => Promise.resolve()";
const THROWING_RULE = "({params}) => { throw new Error('boom'); }";
const GOOD_RULE = "({params, imports}) => new imports.rulesConfig.FormElementStatus(params.formElement.uuid, true, null)";

function makeService() {
    const svc = new RuleEvaluationService({}, {beansMap: new Map()});
    svc.saveFailedRules = jest.fn();
    svc.getIndividualUUID = jest.fn(() => "ind-1");
    svc.getRuleServiceLibraryInterfaceForSharingModules = jest.fn(() => ({}));
    svc.getCommonParams = jest.fn(() => ({}));
    return svc;
}

function formElement(rule, guidedCameraValue) {
    return {
        uuid: "fe-1",
        name: "Oral Image",
        rule,
        recordValueByKey: (key) => (key === "guidedCamera" ? guidedCameraValue : undefined)
    };
}

function run(svc, fe, entity = {uuid: "enc-1"}) {
    return svc.runFormElementStatusRule(fe, entity, "Encounter", {}, null, new Map());
}

describe("a guided-camera rule that returns a Promise", () => {
    it("is replaced by a visible, blocked status instead of the un-matchable Promise", () => {
        const result = run(makeService(), formElement(PROMISE_RULE, true));
        assert.equal(result.uuid, "fe-1");
        assert.isTrue(result.visibility, "the row must stay visible so the worker sees why it is blocked");
        assert.deepEqual(result.captureGuidance.blockCapture, {reason: "misconfiguration"});
    });

    it("still logs the Promise contract violation", () => {
        const logError = jest.spyOn(General, "logError").mockImplementation(() => {});
        try {
            run(makeService(), formElement(PROMISE_RULE, true));
            const messages = logError.mock.calls.map(call => String(call[1]));
            assert.isTrue(messages.some(m => m.includes("returned a Promise")), messages.join(" | "));
        } finally {
            logError.mockRestore();
        }
    });

    it("applies to the string 'true' keyValue as well", () => {
        const result = run(makeService(), formElement(PROMISE_RULE, "true"));
        assert.deepEqual(result.captureGuidance.blockCapture, {reason: "misconfiguration"});
    });

    it("leaves a NON guided-camera element's Promise exactly as it was returned", () => {
        const result = run(makeService(), formElement(PROMISE_RULE, false));
        assert.isFunction(result.then, "platform-wide behaviour for other elements must not change");
    });

    it("carries a questionGroupIndex, as the repeatable-group caller assigns one after the fact", () => {
        const result = run(makeService(), formElement(PROMISE_RULE, true));
        result.addQuestionGroupInformation(2);
        assert.equal(result.questionGroupIndex, 2);
    });
});

describe("a guided-camera rule that throws", () => {
    it("returns a visible, blocked status instead of null", () => {
        const result = run(makeService(), formElement(THROWING_RULE, true));
        assert.isTrue(result.visibility);
        assert.deepEqual(result.captureGuidance.blockCapture, {reason: "misconfiguration"});
    });

    it("still records the rule failure", () => {
        const svc = makeService();
        run(svc, formElement(THROWING_RULE, true));
        assert.equal(svc.saveFailedRules.mock.calls.length, 1);
    });

    it("still returns the blocked status when failure-reporting itself throws", () => {
        const svc = makeService();
        svc.saveFailedRules = jest.fn(() => { throw new Error("reporting blew up"); });
        const result = run(svc, formElement(THROWING_RULE, true));
        assert.deepEqual(result.captureGuidance.blockCapture, {reason: "misconfiguration"});
    });

    it("does not throw when there is no entity to derive a uuid from", () => {
        const result = run(makeService(), formElement(THROWING_RULE, true), null);
        assert.deepEqual(result.captureGuidance.blockCapture, {reason: "misconfiguration"});
    });

    it("still returns null for a NON guided-camera element", () => {
        const svc = makeService();
        assert.isNull(run(svc, formElement(THROWING_RULE, false)));
        assert.equal(svc.saveFailedRules.mock.calls.length, 1);
    });
});

describe("a well-behaved guided-camera rule", () => {
    it("is returned untouched, with no guidance injected", () => {
        const result = run(makeService(), formElement(GOOD_RULE, true));
        assert.isTrue(result.visibility);
        assert.isUndefined(result.captureGuidance);
    });

    it("an element with no rule at all is unaffected", () => {
        const result = run(makeService(), formElement("   ", true));
        assert.isUndefined(result.captureGuidance);
    });
});
