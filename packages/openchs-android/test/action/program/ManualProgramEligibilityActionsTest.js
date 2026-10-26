import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {ManualProgramEligibilityActions} from "../../../src/action/program/ManualProgramEligibilityActions";
import SubjectProgramEligibilityService from "../../../src/service/program/SubjectProgramEligibilityService";
import RuleEvaluationService from "../../../src/service/RuleEvaluationService";

describe("ManualProgramEligibilityActions.onSave", () => {
    it("saves a cloned eligibility entity without modifying the original", () => {
        const original = {
            eligible: false,
            subject: {uuid: "subject-1"},
            program: {uuid: "program-1"},
            cloneForEdit: jest.fn(() => ({
                eligible: false,
                subject: {uuid: "subject-1"},
                program: {uuid: "program-1"}
            }))
        };

        const savedEntities = [];
        const eligibilityService = {
            saveOrUpdate: jest.fn(entity => savedEntities.push(entity))
        };

        const ruleEvaluationService = {};
        const context = {
            get: klass => {
                if (klass === SubjectProgramEligibilityService) return eligibilityService;
                if (klass === RuleEvaluationService) return ruleEvaluationService;
            }
        };

        const state = {
            subjectProgramEligibility: original,
            clone() {
                return {
                    subjectProgramEligibility: this.subjectProgramEligibility,
                    isEligible: () => true
                };
            }
        };

        const callback = jest.fn();

        const result = ManualProgramEligibilityActions.onSave(
            state,
            {cb: callback},
            context
        );

        assert.equal(original.eligible, false);
        assert.equal(original.cloneForEdit.mock.calls.length, 1);
        assert.equal(savedEntities.length, 1);
        assert.notStrictEqual(savedEntities[0], original);
        assert.equal(savedEntities[0].eligible, true);
        assert.strictEqual(result.subjectProgramEligibility, savedEntities[0]);
        assert.equal(callback.mock.calls.length, 1);
    });
});
