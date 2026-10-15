/**
 * A subject type reset deletes the subjects' visits, enrolments, checklists, approvals
 * and unlinks their tasks, so it must also drop the download points those records are
 * filed under. The server keys them by visit type, programme and checklist detail, not
 * by subject type; Task has one point for the whole user.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ResetSyncRewindSqliteTest
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));
jest.mock("react-native-randombytes", () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock("react-native-zip-archive", () => ({
    zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()})),
}));
jest.mock("react-native-keychain", () => ({
    getGenericPassword: jest.fn(async () => false),
    setGenericPassword: jest.fn(async () => {}),
    resetGenericPassword: jest.fn(async () => {}),
}));

import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import EntitySyncStatusService from "../../../src/service/EntitySyncStatusService";
import ResetSyncService from "../../../src/service/ResetSyncService";
import SubjectMigrationService from "../../../src/service/SubjectMigrationService";
import BackupRestoreRealmService from "../../../src/service/BackupRestoreRealmService";
import FormMappingService from "../../../src/service/FormMappingService";
import ChecklistService from "../../../src/service/ChecklistService";
import IndividualRelationshipService from "../../../src/service/relationship/IndividualRelationshipService";
import {open} from "@op-engineering/op-sqlite";

const at = new Date("2026-09-01T10:00:00.000Z");

describe("a subject type reset rewinds every download point its deleted records came from", () => {
    let rawDb, proxy, resetSyncService;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        const repositoryFactory = new RepositoryFactory(proxy);
        const services = new Map();
        const context = {getRepositoryFactory: () => repositoryFactory, getService: (klass) => services.get(klass)};
        const entitySyncStatusService = new EntitySyncStatusService(proxy, context);
        resetSyncService = new ResetSyncService(proxy, context);
        services.set(EntitySyncStatusService, entitySyncStatusService);
        services.set(SubjectMigrationService, new SubjectMigrationService(proxy, context));
        services.set(FormMappingService, new FormMappingService(proxy, context));
        services.set(ChecklistService, new ChecklistService(proxy, context));
        services.set(IndividualRelationshipService, new IndividualRelationshipService(proxy, context));
        services.set(BackupRestoreRealmService, {isDatabaseNeverSynced: () => false});
        resetSyncService.init();
        resetSyncService.individualService = {findAll: () => proxy.objects("Individual")};

        seed();
        rawDb.executeSync("PRAGMA foreign_keys = ON");
    });

    afterEach(() => rawDb && rawDb.close());

    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const checkpoint = (entityName, entityTypeUuid) =>
        create("EntitySyncStatus", {uuid: `${entityName}-${entityTypeUuid}`, entityName, entityTypeUuid, loadedSince: at});
    const hasCheckpoint = (entityName, entityTypeUuid) =>
        rawDb.executeSync(`SELECT COUNT(*) AS n FROM entity_sync_status WHERE entity_name = '${entityName}' AND entity_type_uuid = '${entityTypeUuid}'`).rows[0].n === 1;

    function seed() {
        create("SubjectType", {uuid: "cohort", name: "Cohort", type: "Individual", voided: false});
        create("SubjectType", {uuid: "household", name: "Household", type: "Household", voided: false});
        create("Program", {uuid: "training", name: "Training", voided: false});
        create("Program", {uuid: "nutrition", name: "Nutrition", voided: false});
        ["review", "session", "survey"].forEach(uuid => create("EncounterType", {uuid, name: uuid, voided: false}));
        create("Form", {uuid: "form", formType: "Encounter", name: "Form"});
        const mapping = (uuid, subjectType, fields) => create("FormMapping", {uuid, form: {uuid: "form"}, subjectType: {uuid: subjectType}, voided: false, enableApproval: false, ...fields});
        mapping("cohort-registration", "cohort", {});
        mapping("cohort-review", "cohort", {observationsTypeEntityUUID: "review"});
        mapping("cohort-training", "cohort", {entityUUID: "training"});
        mapping("cohort-session", "cohort", {entityUUID: "training", observationsTypeEntityUUID: "session"});
        mapping("household-survey", "household", {observationsTypeEntityUUID: "survey"});
        mapping("household-nutrition", "household", {entityUUID: "nutrition"});
        create("ChecklistDetail", {uuid: "kit", name: "Kit", voided: false});
        create("ChecklistDetail", {uuid: "vaccination", name: "Vaccination", voided: false});

        create("SubjectType", {uuid: "village", name: "Village", type: "Group", voided: false});
        create("SubjectType", {uuid: "mother", name: "Mother", type: "Person", voided: false});
        create("SubjectType", {uuid: "child", name: "Child", type: "Person", voided: false});
        create("SubjectType", {uuid: "camp", name: "Camp", type: "Individual", voided: false});
        const role = (uuid, groupSubjectType, memberSubjectType, voided) => create("GroupRole", {uuid, role: uuid, groupSubjectType: {uuid: groupSubjectType}, memberSubjectType: {uuid: memberSubjectType}, primary: false, maximumNumberOfMembers: 10, minimumNumberOfMembers: 1, voided});
        role("household-child", "household", "child", false);
        role("village-child", "village", "child", true);
        create("Program", {uuid: "outreach", name: "Outreach", voided: false});
        mapping("camp-outreach", "camp", {entityUUID: "outreach"});

        create("Individual", {uuid: "c1", firstName: "c1", subjectType: {uuid: "cohort"}, registrationDate: at, voided: false});
        create("ProgramEnrolment", {uuid: "c1-training", program: {uuid: "training"}, individual: {uuid: "c1"}, enrolmentDateTime: at, voided: false});
        create("Checklist", {uuid: "c1-kit", detail: {uuid: "kit"}, programEnrolment: {uuid: "c1-training"}, baseDate: at});
        create("Individual", {uuid: "h1", firstName: "h1", subjectType: {uuid: "household"}, registrationDate: at, voided: false});
        create("ProgramEnrolment", {uuid: "h1-nutrition", program: {uuid: "nutrition"}, individual: {uuid: "h1"}, enrolmentDateTime: at, voided: false});
        create("Checklist", {uuid: "h1-vaccination", detail: {uuid: "vaccination"}, programEnrolment: {uuid: "h1-nutrition"}, baseDate: at});

        [
            ["Individual", "cohort"], ["SubjectEntityApprovalStatus", "cohort"],
            ["Encounter", "review"], ["EncounterEntityApprovalStatus", "review"],
            ["ProgramEncounter", "session"], ["ProgramEncounterEntityApprovalStatus", "session"],
            ["ProgramEnrolment", "training"], ["ProgramEnrolmentEntityApprovalStatus", "training"],
            ["Checklist", "kit"], ["ChecklistItem", "kit"],
            ["Task", ""],
            ["Individual", "household"], ["Encounter", "survey"], ["ProgramEnrolment", "nutrition"],
            ["Checklist", "vaccination"], ["ChecklistItem", "vaccination"], ["Concept", ""],
            ["GroupSubject", "household"], ["GroupSubject", "village"],
            ["IndividualRelationship", "mother"], ["IndividualRelationship", "child"],
        ].forEach(([entityName, entityTypeUuid]) => checkpoint(entityName, entityTypeUuid));
    }

    const resetAndRun = (subjectTypeUUID) => {
        create("ResetSync", {uuid: `reset-${subjectTypeUUID}`, subjectTypeUUID, voided: false, hasMigrated: false});
        resetSyncService.resetSync();
    };
    const assertRewound = (points) => points.forEach(([entityName, entityTypeUuid]) =>
        assert.isFalse(hasCheckpoint(entityName, entityTypeUuid), `${entityName} ${entityTypeUuid} should be rewound`));
    const assertKept = (points) => points.forEach(([entityName, entityTypeUuid]) =>
        assert.isTrue(hasCheckpoint(entityName, entityTypeUuid), `${entityName} ${entityTypeUuid} should be kept`));

    it("drops the points for the subject type's visits, enrolments, checklists, their approvals, and tasks", () => {
        resetAndRun("cohort");

        assertRewound([
            ["Individual", "cohort"], ["SubjectEntityApprovalStatus", "cohort"],
            ["Encounter", "review"], ["EncounterEntityApprovalStatus", "review"],
            ["ProgramEncounter", "session"], ["ProgramEncounterEntityApprovalStatus", "session"],
            ["ProgramEnrolment", "training"], ["ProgramEnrolmentEntityApprovalStatus", "training"],
            ["Checklist", "kit"], ["ChecklistItem", "kit"],
            ["Task", ""],
        ]);
    });

    it("keeps the points of other subject types and reference data", () => {
        resetAndRun("cohort");

        assertKept([
            ["Individual", "household"], ["Encounter", "survey"], ["ProgramEnrolment", "nutrition"],
            ["Checklist", "vaccination"], ["ChecklistItem", "vaccination"], ["Concept", ""],
        ]);
        assert.equal(rawDb.executeSync("SELECT COUNT(*) AS n FROM individual").rows[0].n, 1);
    });

    // Memberships are filed under the group's type. The server still sends them under a voided role.
    it("drops the membership points of every group type the reset type is a member of", () => {
        resetAndRun("child");

        assertRewound([["GroupSubject", "household"], ["GroupSubject", "village"]]);
    });

    it("keeps the membership points when the reset type is not a member type", () => {
        resetAndRun("cohort");

        assertKept([["GroupSubject", "household"], ["GroupSubject", "village"]]);
    });

    // A relationship is filed under one side's type, and the reset deletes it from either side
    it("drops the relationship points of every subject type", () => {
        resetAndRun("child");

        assertRewound([["IndividualRelationship", "mother"], ["IndividualRelationship", "child"]]);
    });
});
