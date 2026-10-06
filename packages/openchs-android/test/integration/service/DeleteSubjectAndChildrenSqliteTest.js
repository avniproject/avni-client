/**
 * SubjectMigrationService.deleteSubjectAndChildren on SQLite. Sync runs it with shallow
 * hydration on, where list properties read as [], and a reset sync may run it with
 * foreign keys on. Both must remove every record that belongs to the subject.
 *
 * Run: npx jest --selectProjects integration --testPathPattern DeleteSubjectAndChildrenSqliteTest
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));

import _ from "lodash";
import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import SubjectMigrationService from "../../../src/service/SubjectMigrationService";
import IndividualRelationshipService from "../../../src/service/relationship/IndividualRelationshipService";
import {open} from "@op-engineering/op-sqlite";

const SUBJECT_OWNED_TABLES = [
    "individual", "program_enrolment", "program_encounter", "encounter", "checklist", "checklist_item",
    "entity_approval_status", "comment", "comment_thread", "group_subject", "individual_relationship",
    "draft_subject", "draft_encounter", "draft_enrolment", "draft_program_encounter",
];

describe("deleteSubjectAndChildren on SQLite", () => {
    let rawDb, proxy, repositoryFactory, service;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);
        repositoryFactory = new RepositoryFactory(proxy);

        const services = new Map();
        const context = {getRepositoryFactory: () => repositoryFactory, getService: (key) => services.get(key)};
        services.set(IndividualRelationshipService, new IndividualRelationshipService(proxy, context));
        service = new SubjectMigrationService(proxy, context);
        service.entityService = {findByUUID: (uuid, schema) => proxy.objects(schema).filtered("uuid = $0", uuid)[0]};
    });

    afterEach(() => rawDb && rawDb.close());

    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const observations = [{concept: {uuid: "concept-1"}, valueJSON: JSON.stringify({answer: 12})}];
    const location = {x: 85.8, y: 20.3};
    const at = new Date("2026-09-01T10:00:00.000Z");

    const approval = (uuid, entityUUID, entityType) =>
        create("EntityApprovalStatus", {uuid, entityUUID, entityType, approvalStatus: {uuid: "approved"}, statusDateTime: at, voided: false, observations});

    function seedReferenceData() {
        create("SubjectType", {uuid: "st", name: "Person", type: "Person", voided: false});
        create("Program", {uuid: "pr", name: "Mother", voided: false});
        create("EncounterType", {uuid: "et", name: "Visit", voided: false});
        create("ApprovalStatus", {uuid: "approved", status: "Approved", voided: false});
        create("GroupRole", {uuid: "role", role: "Member", voided: false});
        create("IndividualRelationshipType", {uuid: "rel-type", name: "Spouse", voided: false});
        create("ChecklistDetail", {uuid: "cd", name: "Vaccination", voided: false});
        create("ChecklistItemDetail", {uuid: "cid", voided: false});
    }

    // Records point at their approval through latest_entity_approval_status_uuid, so each
    // approval must outlive the record it belongs to when foreign keys are on.
    function seedSubject(s) {
        approval(`${s}-eas`, s, "Subject");
        create("Individual", {uuid: s, firstName: s, subjectType: {uuid: "st"}, registrationDate: at, voided: false, observations, registrationLocation: location, latestEntityApprovalStatus: {uuid: `${s}-eas`}});
        [1, 2].forEach(n => {
            const enl = `${s}-enl${n}`;
            approval(`${enl}-eas`, enl, "ProgramEnrolment");
            create("ProgramEnrolment", {uuid: enl, program: {uuid: "pr"}, individual: {uuid: s}, enrolmentDateTime: at, voided: false, observations, enrolmentLocation: location, latestEntityApprovalStatus: {uuid: `${enl}-eas`}});
            approval(`${enl}-pe-eas`, `${enl}-pe`, "ProgramEncounter");
            create("ProgramEncounter", {uuid: `${enl}-pe`, encounterType: {uuid: "et"}, programEnrolment: {uuid: enl}, encounterDateTime: at, voided: false, observations, latestEntityApprovalStatus: {uuid: `${enl}-pe-eas`}});
            create("DraftProgramEncounter", {uuid: `${enl}-dpe`, encounterType: {uuid: "et"}, programEnrolment: {uuid: enl}, observations, voided: false, updatedOn: at});
        });
        create("Checklist", {uuid: `${s}-cl`, detail: {uuid: "cd"}, programEnrolment: {uuid: `${s}-enl1`}, baseDate: at});
        approval(`${s}-ci-eas`, `${s}-ci`, "ChecklistItem");
        create("ChecklistItem", {uuid: `${s}-ci`, detail: {uuid: "cid"}, checklist: {uuid: `${s}-cl`}, observations, latestEntityApprovalStatus: {uuid: `${s}-ci-eas`}});
        approval(`${s}-enc-eas`, `${s}-enc`, "Encounter");
        create("Encounter", {uuid: `${s}-enc`, encounterType: {uuid: "et"}, individual: {uuid: s}, encounterDateTime: at, voided: false, observations, latestEntityApprovalStatus: {uuid: `${s}-enc-eas`}});
        create("CommentThread", {uuid: `${s}-thread`, status: "Open", openDateTime: at, voided: false});
        create("Comment", {uuid: `${s}-comment`, text: "hi", subject: {uuid: s}, commentThread: {uuid: `${s}-thread`}, displayUsername: "u", createdByUsername: "u", createdDateTime: at, lastModifiedDateTime: at, voided: false});
        create("DraftSubject", {uuid: s, subjectType: {uuid: "st"}, firstName: s, registrationDate: at, observations, updatedOn: at});
        create("DraftEncounter", {uuid: `${s}-de`, encounterType: {uuid: "et"}, individual: {uuid: s}, observations, voided: false, updatedOn: at});
        create("DraftEnrolment", {uuid: `${s}-den`, program: {uuid: "pr"}, individual: {uuid: s}, enrolmentDateTime: at, observations, voided: false, updatedOn: at});
    }

    function seedBareSubject(s) {
        create("Individual", {uuid: s, firstName: s, subjectType: {uuid: "st"}, registrationDate: at, voided: false});
    }

    function seedMemberships(subject, group, member) {
        create("GroupSubject", {uuid: `${subject}-in-${group}`, groupSubject: {uuid: group}, memberSubject: {uuid: subject}, groupRole: {uuid: "role"}, membershipStartDate: at, voided: false});
        create("GroupSubject", {uuid: `${member}-in-${subject}`, groupSubject: {uuid: subject}, memberSubject: {uuid: member}, groupRole: {uuid: "role"}, membershipStartDate: at, voided: false});
        create("IndividualRelationship", {uuid: `${subject}-rel`, relationship: {uuid: "rel-type"}, individualA: {uuid: subject}, individualB: {uuid: member}, enterDateTime: at, voided: false});
    }

    const rowsMentioning = (prefix) => SUBJECT_OWNED_TABLES.reduce((acc, table) => {
        const columns = rawDb.executeSync(`PRAGMA table_info(${table})`).rows.map(c => `"${c.name}"`);
        const where = columns.map(c => `CAST(${c} AS TEXT) LIKE '${prefix}%'`).join(" OR ");
        const count = rawDb.executeSync(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).rows[0].n;
        return count ? {...acc, [table]: count} : acc;
    }, {});

    const countsByTable = () => SUBJECT_OWNED_TABLES.reduce((acc, table) =>
        ({...acc, [table]: rawDb.executeSync(`SELECT COUNT(*) AS n FROM ${table}`).rows[0].n}), {});

    function seedScenario() {
        seedReferenceData();
        seedSubject("gone");
        seedSubject("kept");
        seedBareSubject("group");
        seedBareSubject("member");
        seedMemberships("gone", "group", "member");
        seedMemberships("kept", "group", "member");
    }

    it("removes every record of an unassigned subject while sync has shallow hydration on", () => {
        seedScenario();
        const keptBefore = rowsMentioning("kept");
        repositoryFactory.setShallowHydrationMode(true);

        service.removeEntitiesFor({subjectUUID: "gone"});

        repositoryFactory.setShallowHydrationMode(false);
        assert.deepEqual(rowsMentioning("gone"), {});
        assert.deepEqual(rowsMentioning("kept"), keptBefore);
        assert.equal(rawDb.executeSync("SELECT COUNT(*) AS n FROM individual WHERE uuid IN ('group', 'member')").rows[0].n, 2);
    });

    it("deletes with foreign keys on, as a reset sync runs it, leaving no dangling references", () => {
        seedScenario();
        rawDb.executeSync("PRAGMA foreign_keys = ON");
        const subject = proxy.objects("Individual").filtered("uuid = $0", "gone")[0];

        service.deleteSubjectAndChildren(subject);

        assert.deepEqual(rowsMentioning("gone"), {});
        assert.deepEqual(rawDb.executeSync("PRAGMA foreign_key_check").rows, []);
    });

    it("deletes a subject with more visits than SQLite allows terms in one expression", () => {
        seedReferenceData();
        seedBareSubject("busy");
        _.range(1200).forEach(i => {
            approval(`busy-enc${i}-eas`, `busy-enc${i}`, "Encounter");
            create("Encounter", {uuid: `busy-enc${i}`, encounterType: {uuid: "et"}, individual: {uuid: "busy"}, encounterDateTime: at, voided: false, latestEntityApprovalStatus: {uuid: `busy-enc${i}-eas`}});
        });

        service.removeEntitiesFor({subjectUUID: "busy"});

        assert.deepEqual(rowsMentioning("busy"), {});
    });

    it("deletes a subject that has nothing under it and touches nothing else", () => {
        seedScenario();
        seedBareSubject("lonely");
        const before = countsByTable();

        service.removeEntitiesFor({subjectUUID: "lonely"});

        assert.deepEqual(countsByTable(), {...before, individual: before.individual - 1});
    });
});
