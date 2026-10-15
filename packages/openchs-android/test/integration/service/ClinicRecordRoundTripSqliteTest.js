/**
 * Each shared record type, saved on phone A, sent as A would send it (toResource), and applied on
 * phone B through ClinicRecordService, must come out the same on B, field by field.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ClinicRecordRoundTripSqliteTest
 */
jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));
jest.mock('react-native-libsodium', () => require('libsodium-wrappers'));
jest.mock('react-native-tcp-socket', () => require('net'));
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));

import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import EntityService from "../../../src/service/EntityService";
import PrivilegeService from "../../../src/service/PrivilegeService";
import SyncService from "../../../src/service/SyncService";
import ClinicRecordService from "../../../src/service/clinicsharing/ClinicRecordService";
import {open} from "@op-engineering/op-sqlite";

const at = new Date("2026-10-01T10:00:00.000Z");
const later = new Date("2026-10-02T11:30:00.000Z");
const observations = [
    {concept: {uuid: "c-text"}, valueJSON: JSON.stringify({answer: "Swelling in both feet"})},
    {concept: {uuid: "c-number"}, valueJSON: JSON.stringify({answer: 12})},
];

function phone() {
    const rawDb = open({});
    const cfg = EntityMappingConfig.getInstance();
    const tableMetaMap = SchemaGenerator.generateAll(cfg);
    rawDb.executeSync("PRAGMA foreign_keys = OFF");
    for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
    const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));
    const repositoryFactory = new RepositoryFactory(proxy);
    const services = new Map();
    const context = {getRepositoryFactory: () => repositoryFactory, getService: (key) => services.get(key)};
    [EntityService, PrivilegeService, SyncService, ClinicRecordService].forEach((cls) => services.set(cls, new cls(proxy, context)));
    services.set('clinicHoldBackService', {recordReceived: async () => {}});
    services.set('clinicMediaService', {recordReceivedMedia: async () => {}});
    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const read = (schema, uuid) => proxy.objects(schema).filtered("uuid = $0", uuid)[0];

    create("Concept", {uuid: "c-text", name: "Complaint", datatype: "Text", voided: false});
    create("Concept", {uuid: "c-number", name: "Weeks", datatype: "Numeric", voided: false});
    create("Concept", {uuid: "c-reason", name: "Reason", datatype: "NA", voided: false});
    create("SubjectType", {uuid: "st-person", name: "Person", type: "Person", voided: false});
    create("SubjectType", {uuid: "st-household", name: "Household", type: "Household", voided: false});
    create("Gender", {uuid: "female", name: "Female", voided: false});
    create("AddressLevel", {uuid: "village", title: "Village", level: 1, voided: false, type: "Village"});
    create("Program", {uuid: "pr-mother", name: "Mother", voided: false});
    create("EncounterType", {uuid: "et-anc", name: "ANC", voided: false});
    create("ApprovalStatus", {uuid: "approved", status: "Approved", voided: false});
    create("ChecklistDetail", {uuid: "cd-vaccine", name: "Vaccination", voided: false});
    create("ChecklistItemDetail", {uuid: "cid-bcg", voided: false, checklistDetail: {uuid: "cd-vaccine"}});
    create("IndividualRelationshipType", {uuid: "rel-spouse", name: "Spouse", voided: false});
    create("GroupRole", {uuid: "role-member", role: "Member", voided: false});
    create("AttendanceType", {uuid: "att-class", name: "Class", voided: false});
    create("Groups", {uuid: "admins", name: "Administrators", hasAllPrivileges: true});
    create("MyGroups", {uuid: "my-admins", groupUuid: "admins", groupName: "Administrators", voided: false});
    return {proxy, rawDb, create, read, recordService: services.get(ClinicRecordService)};
}

// What phone A holds: every shared type, linked the way the app links them.
function seedPhoneA(a) {
    a.create("Individual", {uuid: "ind-1", firstName: "Sunita", lastName: "Devi", dateOfBirth: new Date("1994-03-02"), dateOfBirthVerified: false,
        registrationDate: new Date("2026-10-01"), subjectType: {uuid: "st-person"}, gender: {uuid: "female"}, lowestAddressLevel: {uuid: "village"},
        observations, voided: false, registrationLocation: {x: 85.8, y: 20.3}});
    a.create("Individual", {uuid: "hh-1", firstName: "Devi household", registrationDate: new Date("2026-10-01"), subjectType: {uuid: "st-household"},
        lowestAddressLevel: {uuid: "village"}, observations: [], voided: false});
    a.create("Individual", {uuid: "ind-2", firstName: "Ramesh", lastName: "Kumar", dateOfBirth: new Date("1990-01-01"), registrationDate: new Date("2026-10-01"),
        subjectType: {uuid: "st-person"}, gender: {uuid: "female"}, lowestAddressLevel: {uuid: "village"}, observations: [], voided: false});
    a.create("ProgramEnrolment", {uuid: "enl-1", program: {uuid: "pr-mother"}, individual: {uuid: "ind-1"}, enrolmentDateTime: at, observations, programExitObservations: [], voided: false});
    a.create("ProgramEncounter", {uuid: "pe-1", encounterType: {uuid: "et-anc"}, programEnrolment: {uuid: "enl-1"}, encounterDateTime: at, observations, cancelObservations: [], voided: false, name: "ANC 1"});
    a.create("Encounter", {uuid: "enc-1", encounterType: {uuid: "et-anc"}, individual: {uuid: "ind-1"}, encounterDateTime: at, observations, cancelObservations: [], voided: false});
    a.create("Encounter", {uuid: "enc-cancelled", encounterType: {uuid: "et-anc"}, individual: {uuid: "ind-1"}, earliestVisitDateTime: at, maxVisitDateTime: later,
        cancelDateTime: later, cancelObservations: observations, observations: [], voided: false});
    a.create("Checklist", {uuid: "cl-1", detail: {uuid: "cd-vaccine"}, programEnrolment: {uuid: "enl-1"}, baseDate: at});
    a.create("ChecklistItem", {uuid: "ci-1", detail: {uuid: "cid-bcg"}, checklist: {uuid: "cl-1"}, completionDate: later, observations: []});
    a.create("IndividualRelationship", {uuid: "rel-1", relationship: {uuid: "rel-spouse"}, individualA: {uuid: "ind-1"}, individualB: {uuid: "ind-2"}, enterDateTime: at, exitObservations: [], voided: false});
    a.create("GroupSubject", {uuid: "gs-1", groupSubject: {uuid: "hh-1"}, memberSubject: {uuid: "ind-1"}, groupRole: {uuid: "role-member"}, membershipStartDate: at, voided: false});
    a.create("EntityApprovalStatus", {uuid: "eas-1", entityUUID: "ind-1", entityType: "Subject", entityTypeUuid: "st-person", approvalStatus: {uuid: "approved"},
        approvalStatusComment: "Checked at the van", statusDateTime: later, autoApproved: false, voided: false, observations: []});
    a.create("CommentThread", {uuid: "th-1", status: "Open", openDateTime: at, voided: false});
    a.create("Comment", {uuid: "cm-1", text: "BP high, refer", subject: {uuid: "ind-1"}, commentThread: {uuid: "th-1"}, displayUsername: "Nurse Asha",
        createdByUsername: "asha@clinic", createdDateTime: at, lastModifiedDateTime: later, voided: false});
    a.create("SubjectProgramEligibility", {uuid: "spe-1", subject: {uuid: "ind-1"}, program: {uuid: "pr-mother"}, checkDate: at, eligible: true, observations, voided: false});
    a.create("Session", {uuid: "ses-1", groupSubjectUUID: "hh-1", scheduledDate: "2026-10-01", attendanceTypeUUID: "att-class", status: "Completed",
        markedByUserName: "asha@clinic", markedAt: later, reasonConceptUUID: "c-reason", notes: "Rain", voided: false});
    a.create("AttendanceRecord", {uuid: "ar-1", sessionUUID: "ses-1", subjectUUID: "ind-1", status: "Absent", reasonConceptUUIDs: ["c-reason"],
        otherReasonText: "Unwell", needsFollowUp: true, voided: false});
}

// The upload-queue names the app uses, parents first.
const SHARED = [
    ["Individual", ["hh-1", "ind-1", "ind-2"]],
    ["ProgramEnrolment", ["enl-1"]],
    ["ProgramEncounter", ["pe-1"]],
    ["Encounter", ["enc-1", "enc-cancelled"]],
    ["Checklist", ["cl-1"]],
    ["ChecklistItem", ["ci-1"]],
    ["IndividualRelationship", ["rel-1"]],
    ["GroupSubject", ["gs-1"]],
    ["EntityApprovalStatus", ["eas-1"]],
    ["CommentThread", ["th-1"]],
    ["Comment", ["cm-1"]],
    ["SubjectProgramEligibility", ["spe-1"]],
    ["Session", ["ses-1"]],
    ["AttendanceRecord", ["ar-1"]],
];

describe("Clinic records round trip, phone to phone", () => {
    let a, b;

    beforeAll(async () => {
        a = phone();
        b = phone();
        seedPhoneA(a);
        const batches = SHARED.map(([entityName, uuids]) => ({
            entityName,
            resources: uuids.map((uuid) => a.recordService.toSharedResource(entityName, a.read(entityName, uuid))),
        }));
        await b.recordService.applyBatches(JSON.parse(JSON.stringify(batches)), () => {});
    });

    afterAll(() => {
        a.rawDb.close();
        b.rawDb.close();
    });

    SHARED.forEach(([entityName, uuids]) => uuids.forEach((uuid) => {
        it(`${entityName} ${uuid} arrives with every field it was sent with`, () => {
            const received = b.read(entityName, uuid);

            expect(received).toBeDefined();
            expect(received.toResource).toEqual(a.read(entityName, uuid).toResource);
        });
    }));

    it("refreshes the subject's latest approval from a shared approval", () => {
        const row = b.rawDb.executeSync("SELECT latest_entity_approval_status_uuid AS latest FROM individual WHERE uuid = 'ind-1'").rows[0];
        expect(row.latest).toBe("eas-1");
    });

    it("keeps a shared comment's author and times, which the server format carries but toResource does not", () => {
        const comment = b.read("Comment", "cm-1");
        expect([comment.displayUsername, comment.createdByUsername]).toEqual(["Nurse Asha", "asha@clinic"]);
        expect([comment.createdDateTime.toISOString(), comment.lastModifiedDateTime.toISOString()]).toEqual([at.toISOString(), later.toISOString()]);
    });
});
