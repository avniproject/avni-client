import {assert} from "chai";
import {Encounter, EntityApprovalStatus, Individual, Program, ProgramEncounter, ProgramEnrolment, SubjectType} from "openchs-models";
import {keepStoredChildren} from "../../src/service/StoredChildren";
import IndividualService from "../../src/service/IndividualService";
import EncounterService from "../../src/service/EncounterService";
import ProgramEncounterService from "../../src/service/program/ProgramEncounterService";
import ProgramEnrolmentService from "../../src/service/ProgramEnrolmentService";
import FormMappingService from "../../src/service/FormMappingService";
import MediaQueueService from "../../src/service/MediaQueueService";
import IdentifierAssignmentService from "../../src/service/IdentifierAssignmentService";
import GroupSubjectService from "../../src/service/GroupSubjectService";
import EntityApprovalStatusService from "../../src/service/EntityApprovalStatusService";
import ChecklistService from "../../src/service/ChecklistService";
import OrganisationConfigService from "../../src/service/OrganisationConfigService";

const withUuid = (Model, uuid) => {
    const e = Model.createEmptyInstance ? Model.createEmptyInstance() : new Model();
    e.uuid = uuid;
    return e;
};
const person = (uuid, visits) => {
    const p = withUuid(Individual, uuid);
    p.firstName = uuid;
    p.subjectType = SubjectType.create("Person", false, false, SubjectType.types.Person);
    visits.forEach((v) => p.encounters.push(withUuid(Encounter, v)));
    return p;
};
const enrolment = (uuid, individual, visits) => {
    const e = withUuid(ProgramEnrolment, uuid);
    e.individual = individual;
    e.program = withUuid(Program, "program");
    visits.forEach((v) => e.encounters.push(withUuid(ProgramEncounter, v)));
    return e;
};
const uuids = (list) => list.map((x) => x.uuid);

// Saves are recorded instead of written; services the save path calls are no-ops.
const harness = (ServiceClass, extra = []) => {
    const created = {};
    const repository = (schema) => ({
        create: (entity) => { (created[schema] = created[schema] || []).push(entity); return entity; },
        existsByUuid: () => true,
        findAll: () => ({filtered: () => []}),
    });
    const noop = () => {};
    const services = new Map([
        ["userInfoService", {getUserInfo: () => ({})}],
        [FormMappingService, {findRegistrationForm: noop, isApprovalEnabledForRegistrationForm: () => false, isApprovalEnabledForProgramForm: () => false,
            isApprovalEnabledForEncounterForm: () => false, findFormForProgramEnrolment: noop}],
        [MediaQueueService, {addMediaToQueue: noop}],
        [IdentifierAssignmentService, {assignPopulatedIdentifiersFromObservations: noop}],
        [GroupSubjectService, {addSubjectToGroup: () => noop}],
        [EntityApprovalStatusService, {createPendingStatus: noop}],
        [ChecklistService, {saveOrUpdate: () => []}],
        [OrganisationConfigService, {hasHideTotalForProgram: () => false}],
        [EncounterService, {saveScheduledVisits: noop}],
        [ProgramEncounterService, {saveScheduledVisits: noop}],
        ...extra,
    ]);
    const context = {getService: (k) => services.get(k), getRepositoryFactory: () => ({getRepository: repository, transactionManager: {write: (fn) => fn()}})};
    const service = new ServiceClass(null, context);
    if (service.init) service.init();
    return {service, created, services};
};

describe("keepStoredChildren", () => {
    it("keeps every stored child, adds the copy's new ones, and prefers the stored version of a shared one", () => {
        const stored = person("p", ["a", "b"]);
        const copy = person("p", ["a", "c"]);
        copy.encounters[0].name = "stale";
        stored.encounters[0].name = "fresh";

        keepStoredChildren(copy, stored, ["encounters"]);

        assert.deepEqual(uuids(copy.encounters), ["a", "b", "c"]);
        assert.equal(copy.encounters[0].name, "fresh");
    });

    it("leaves the copy alone when nothing is stored yet", () => {
        const copy = person("p", ["a"]);
        keepStoredChildren(copy, null, ["encounters"]);
        assert.deepEqual(uuids(copy.encounters), ["a"]);
    });
});

describe("Saving a copy taken when a form opened keeps children saved since", () => {
    it("re-saving a saved subject from a form copy with no visits (an edit, a Save retried after Add Member partly failed, or an old draft) keeps the stored visits and a new pending approval", () => {
        const {service, created} = harness(IndividualService);
        const stored = person("p", ["v1", "v2", "v3", "v4"]);
        stored.approvalStatuses.push(withUuid(EntityApprovalStatus, "old-status"));
        service.findByUUID = () => stored;
        service.entityApprovalStatusService = {createPendingStatus: (entity) => entity.approvalStatuses.push(withUuid(EntityApprovalStatus, "new-status"))};
        const formCopy = person("p", []);
        service.getService(FormMappingService).isApprovalEnabledForRegistrationForm = () => true;

        service.register(formCopy, [], false, []);

        const saved = created["Individual"][0];
        assert.deepEqual(uuids(saved.encounters), ["v1", "v2", "v3", "v4"]);
        assert.deepEqual(uuids(saved.approvalStatuses), ["old-status", "new-status"]);
    });

    it("a visit saves its person as stored, not the copy taken when its form opened", () => {
        const {service, created} = harness(EncounterService);
        const stored = person("p", ["v1", "v2"]);
        service.findByUUID = () => stored;
        const visit = withUuid(Encounter, "v3");
        visit.individual = person("p", ["v1"]);

        service._saveEncounter(visit);

        assert.strictEqual(created["Encounter"][0].that.individual, stored.that);
    });

    it("a program visit saves its enrolment as stored, not the copy taken when its form opened", () => {
        const {service, created} = harness(ProgramEncounterService);
        const stored = enrolment("e", person("p", []), ["pv1", "pv2"]);
        service.findByUUID = () => stored;
        const visit = withUuid(ProgramEncounter, "pv3");
        visit.programEnrolment = enrolment("e", person("p", []), []);

        service._saveEncounter(visit);

        assert.strictEqual(created["ProgramEncounter"][0].that.programEnrolment, stored.that);
    });

    it("enrolling saves the person as stored, and editing an enrolment keeps its stored visits", () => {
        const {service, created} = harness(ProgramEnrolmentService);
        const storedPerson = person("p", ["v1", "v2"]);
        const storedEnrolment = enrolment("e", storedPerson, ["pv1", "pv2"]);
        service.findByUUID = (uuid, schema) => (schema === "Individual" ? storedPerson : storedEnrolment);
        const formCopy = enrolment("e", person("p", []), []);

        service.enrol(formCopy, [], [], true, []);

        const saved = created["ProgramEnrolment"][0];
        assert.strictEqual(saved.that.individual, storedPerson.that);
        assert.deepEqual(uuids(saved.encounters), ["pv1", "pv2"]);
    });

    it("exiting saves the person as stored and keeps the enrolment's stored visits", () => {
        const {service, created} = harness(ProgramEnrolmentService);
        const storedPerson = person("p", ["v1"]);
        const storedEnrolment = enrolment("e", storedPerson, ["pv1"]);
        service.findByUUID = (uuid, schema) => (schema === "Individual" ? storedPerson : storedEnrolment);
        const formCopy = enrolment("e", person("p", []), []);

        service.exit(formCopy, true, []);

        const saved = created["ProgramEnrolment"][0];
        assert.strictEqual(saved.that.individual, storedPerson.that);
        assert.deepEqual(uuids(saved.encounters), ["pv1"]);
    });
});
