// Realm 12 rejects a proxy-wrapped entity as a .filtered() argument ("Unable to convert
// an object with ctor 'SubjectType' to a Mixed"), so these queries must pass primitives
// (uuid), never the wrapper. Regression for avniproject/avni-client#2004.

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import {SubjectType, Individual} from "avni-models";
import IndividualService from "../../src/service/IndividualService";
import FormMappingService from "../../src/service/FormMappingService";
import SubjectProgramEligibilityService from "../../src/service/program/SubjectProgramEligibilityService";

// What RealmResultsProxy.map()/createEntity hands back: a wrapper instance whose managed
// object sits on `.that` — not a managed Realm object itself.
const wrappedSubjectType = (uuid) => new SubjectType({uuid, name: "Household"});
const wrappedIndividual = (uuid) => new Individual({uuid});

function captureFiltered() {
    const filtered = jest.fn(() => []);
    return {results: {filtered}, filtered};
}

function expectPrimitiveArgs(filtered, expectedQuery, expectedUuid) {
    const [query, ...args] = filtered.mock.calls[0];
    expect(query).toBe(expectedQuery);
    expect(args).toEqual([expectedUuid]);
    args.forEach(arg => expect(typeof arg).toBe("string")); // never the wrapper object
}

describe("wrapped-entity queries pass uuid primitives, not the wrapper (#2004)", () => {
    it("IndividualService.getAllBySubjectType", () => {
        const service = new IndividualService(null, null);
        const {results, filtered} = captureFiltered();
        service.getAll = jest.fn(() => results);

        service.getAllBySubjectType(wrappedSubjectType("st-1"));

        expectPrimitiveArgs(filtered, "subjectType.uuid = $0", "st-1");
    });

    it("FormMappingService.getFormMappingsForSubjectType", () => {
        const service = new FormMappingService(null, null);
        const {results, filtered} = captureFiltered();
        service.findAll = jest.fn(() => results);

        service.getFormMappingsForSubjectType(wrappedSubjectType("st-2"));

        expectPrimitiveArgs(filtered, "subjectType.uuid = $0", "st-2");
    });

    it("SubjectProgramEligibilityService.findBySubject", () => {
        const service = new SubjectProgramEligibilityService(null, null);
        const {results, filtered} = captureFiltered();
        service.getAllNonVoided = jest.fn(() => results);

        service.findBySubject(wrappedIndividual("sub-1"));

        expectPrimitiveArgs(filtered, "subject.uuid = $0", "sub-1");
    });

    it("SubjectProgramEligibilityService.findBySubject returns [] for nil, matching IndividualRelationshipService", () => {
        const service = new SubjectProgramEligibilityService(null, null);
        service.getAllNonVoided = jest.fn();

        expect(service.findBySubject(null)).toEqual([]);
        expect(service.findBySubject(undefined)).toEqual([]);
        expect(service.getAllNonVoided).not.toHaveBeenCalled();
    });
});
