import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {ManualProgramEligibilityActions} from "../../../src/action/program/ManualProgramEligibilityActions";
import SubjectProgramEligibilityService from "../../../src/service/program/SubjectProgramEligibilityService";
import FormMappingService from "../../../src/service/FormMappingService";
import SubjectProgramEligibilityState from "../../../src/state/SubjectProgramEligibilityState";

describe("ManualProgramEligibilityActions.onLoad", () => {
    it("clones an existing eligibility entity before creating the form state", () => {
        const detachedEligibility = {eligible: false};
        const original = {
            cloneForEdit: jest.fn(() => detachedEligibility)
        };

        const form = {
            nonVoidedFormElementGroups: () => []
        };

        const eligibilityService = {
            findBySubjectAndProgram: jest.fn(() => original)
        };

        const formMappingService = {
            getManualEnrolmentEligibilityForm: jest.fn(() => form)
        };

        const context = {
            get: klass => {
                if (klass === SubjectProgramEligibilityService) return eligibilityService;
                if (klass === FormMappingService) return formMappingService;
            }
        };

        const expectedState = {};
        const stateSpy = jest.spyOn(
            SubjectProgramEligibilityState,
            "createOnLoadStateForEmptyForm"
        ).mockReturnValue(expectedState);

        const subject = {subjectType: {uuid: "type-1"}};
        const program = {uuid: "program-1"};

        const result = ManualProgramEligibilityActions.onLoad(
            null,
            {subject, program},
            context
        );

        assert.equal(original.cloneForEdit.mock.calls.length, 1);
        assert.strictEqual(stateSpy.mock.calls[0][0], detachedEligibility);
        assert.strictEqual(result, expectedState);

        stateSpy.mockRestore();
    });
});
