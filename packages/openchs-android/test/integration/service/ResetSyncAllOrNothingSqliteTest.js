/**
 * ResetSyncService.resetSync on SQLite, with foreign keys on beforehand as they are when
 * sync calls it. The reset must not trip over records that still point at a departing
 * subject, and a reset that fails part-way must leave the data as it was and stay pending.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ResetSyncAllOrNothingSqliteTest
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

import {EntityMappingConfig, EntityMetaData} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import EntitySyncStatusService from "../../../src/service/EntitySyncStatusService";
import ResetSyncService from "../../../src/service/ResetSyncService";
import SubjectMigrationService from "../../../src/service/SubjectMigrationService";
import BackupRestoreRealmService from "../../../src/service/BackupRestoreRealmService";
import IndividualRelationshipService from "../../../src/service/relationship/IndividualRelationshipService";
import {open} from "@op-engineering/op-sqlite";

const at = new Date("2026-09-01T10:00:00.000Z");

describe("a reset sync on SQLite runs all-or-nothing", () => {
    let rawDb, proxy, resetSyncService, entitySyncStatusService, subjectMigrationService;

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
        entitySyncStatusService = new EntitySyncStatusService(proxy, context);
        subjectMigrationService = new SubjectMigrationService(proxy, context);
        resetSyncService = new ResetSyncService(proxy, context);
        services.set(EntitySyncStatusService, entitySyncStatusService);
        services.set(SubjectMigrationService, subjectMigrationService);
        services.set(IndividualRelationshipService, new IndividualRelationshipService(proxy, context));
        services.set(BackupRestoreRealmService, {isDatabaseNeverSynced: () => false});
        resetSyncService.init();
        resetSyncService.individualService = {findAll: () => proxy.objects("Individual")};

        seed();
        rawDb.executeSync("PRAGMA foreign_keys = ON");
    });

    afterEach(() => rawDb && rawDb.close());

    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const count = (table, where = "1 = 1") => rawDb.executeSync(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).rows[0].n;
    const foreignKeysOn = () => rawDb.executeSync("SELECT foreign_keys FROM pragma_foreign_keys").rows[0].foreign_keys === 1;
    const resetPending = () => count("reset_sync", "has_migrated = 0") > 0;

    function seed() {
        create("SubjectType", {uuid: "st", name: "Person", type: "Person", voided: false});
        create("ApprovalStatus", {uuid: "approved", status: "Approved", voided: false});
        ["s1", "s2"].forEach(s => {
            create("EntityApprovalStatus", {uuid: `${s}-eas`, entityUUID: s, entityType: "Subject", approvalStatus: {uuid: "approved"}, statusDateTime: at, voided: false});
            create("Individual", {uuid: s, firstName: s, subjectType: {uuid: "st"}, registrationDate: at, voided: false, latestEntityApprovalStatus: {uuid: `${s}-eas`}});
        });
        EntityMetaData.getEntitiesToBePulled()
            .filter(entity => !entity.privilegeParam)
            .forEach(entity => create("EntitySyncStatus", {uuid: `checkpoint-${entity.entityName}`, entityName: entity.entityName, loadedSince: at, entityTypeUuid: ""}));
        create("EntitySyncStatus", {uuid: "checkpoint-st", entityName: "Individual", loadedSince: at, entityTypeUuid: "st"});
    }

    const subjectTypeReset = () => create("ResetSync", {uuid: "reset-st", subjectTypeUUID: "st", voided: false, hasMigrated: false});
    const catchmentReset = () => create("ResetSync", {uuid: "reset-all", voided: false, hasMigrated: false});

    describe("a subject type reset", () => {
        beforeEach(subjectTypeReset);

        it("deletes a subject that a task still points at", () => {
            create("Task", {uuid: "task-1", name: "Call", subject: {uuid: "s1"}, scheduledOn: at, voided: false});

            resetSyncService.resetSync();

            assert.equal(count("individual"), 0);
            assert.isFalse(resetPending());
            assert.isTrue(foreignKeysOn());
        });

        it("keeps every subject, their checkpoint and the pending reset when a delete fails part-way", () => {
            const deleteSubject = subjectMigrationService.deleteSubjectAndChildren.bind(subjectMigrationService);
            let deleted = 0;
            subjectMigrationService.deleteSubjectAndChildren = (subject) => {
                if (deleted++ === 1) throw new Error("app died");
                deleteSubject(subject);
            };

            assert.throws(() => resetSyncService.resetSync(), "app died");

            assert.equal(count("individual"), 2);
            assert.equal(count("entity_approval_status"), 2);
            assert.equal(count("entity_sync_status", "entity_type_uuid = 'st'"), 1);
            assert.isTrue(resetPending());
            assert.isTrue(foreignKeysOn());
        });
    });

    describe("a catchment reset", () => {
        beforeEach(catchmentReset);

        it("keeps the data, the checkpoints and the pending reset when it fails after the wipe", () => {
            entitySyncStatusService.setup = () => { throw new Error("app died"); };

            assert.throws(() => resetSyncService.resetSync(), "app died");

            assert.equal(count("individual"), 2);
            assert.equal(count("entity_sync_status", "uuid = 'checkpoint-Concept'"), 1);
            assert.isTrue(resetPending());
            assert.isTrue(foreignKeysOn());
        });
    });
});
