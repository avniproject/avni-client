// Verifies FormMappingService.isEnrolmentMapped: one counted query for the program's enrolment mapping of a subject type,
// and that findFormForProgramEnrolment still sends the same criteria through findByCriteria.

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import FormMappingService from "../../src/service/FormMappingService";

const criteria = 'voided = false AND entityUUID="p-1" AND form.formType="ProgramEnrolment" and subjectType.uuid = "st-1"';
const program = {uuid: "p-1"};
const subjectType = {uuid: "st-1"};

const build = (rows) => {
    const service = new FormMappingService(null, null);
    service.findAllByCriteria = jest.fn(() => rows);
    service.findByCriteria = jest.fn(() => rows[0]);
    return service;
};

describe("FormMappingService.isEnrolmentMapped", () => {
    it("asks for the program's enrolment mapping of the subject type", () => {
        const service = build([{}]);
        service.isEnrolmentMapped(program, subjectType);
        assert.deepEqual(service.findAllByCriteria.mock.calls, [[criteria]]);
        assert.equal(service.findByCriteria.mock.calls.length, 0);
    });

    it("is true for one row and for two rows, false for none", () => {
        assert.isTrue(build([{}]).isEnrolmentMapped(program, subjectType));
        assert.isTrue(build([{}, {}]).isEnrolmentMapped(program, subjectType));
        assert.isFalse(build([]).isEnrolmentMapped(program, subjectType));
    });

    it("leaves findFormForProgramEnrolment sending the same criteria through findByCriteria", () => {
        const form = {uuid: "f-1"};
        const service = build([{form}]);
        assert.equal(service.findFormForProgramEnrolment(program, subjectType), form);
        assert.deepEqual(service.findByCriteria.mock.calls, [[criteria]]);
    });
});
