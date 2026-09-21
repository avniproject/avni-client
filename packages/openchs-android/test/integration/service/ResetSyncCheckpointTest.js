/**
 * #2115 — the reset sync's checkpoint survives the wipe, run against the real
 * ResetSyncService and EntitySyncStatusService on a SQLite database built from the
 * generated schema. test/service/ResetSyncServiceTest.js pins the same contract with
 * hand-rolled stand-ins for the checkpoint service; this one can catch a bug in that
 * service or in the storage beneath it.
 *
 * Also pins what the revert of the restore-path change (95d29d8c0) relies on: setup()
 * only creates checkpoints that are missing, so a restored file's own checkpoints are
 * left alone and the sync after a restore stays incremental.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ResetSyncCheckpointTest
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
// Native leaf modules pulled in transitively by ResetSyncService's import tree.
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

import {EntityMappingConfig, EntityMetaData, EntitySyncStatus} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import EntitySyncStatusService from "../../../src/service/EntitySyncStatusService";
import ResetSyncService from "../../../src/service/ResetSyncService";
import BackupRestoreRealmService from "../../../src/service/BackupRestoreRealmService";
import {open} from "@op-engineering/op-sqlite";

const REALLY_OLD_DATE = EntitySyncStatus.REALLY_OLD_DATE;
const RECENT = new Date("2026-09-02T14:03:15.000Z");

describe("the reset sync checkpoint on a real database (#2115)", () => {
    let rawDb, proxy, entitySyncStatusService, resetSyncService;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        const repositoryFactory = new RepositoryFactory(proxy);
        const services = new Map();
        const context = {
            getRepositoryFactory: () => repositoryFactory,
            getService: (klass) => services.get(klass),
        };
        entitySyncStatusService = new EntitySyncStatusService(proxy, context);
        resetSyncService = new ResetSyncService(proxy, context);
        services.set(EntitySyncStatusService, entitySyncStatusService);
        services.set(BackupRestoreRealmService, {isDatabaseNeverSynced: () => false});
        resetSyncService.init();
    });

    afterEach(() => rawDb && rawDb.close());

    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const checkpoint = (entityName, uuid, loadedSince) =>
        create("EntitySyncStatus", {uuid, entityName, loadedSince, entityTypeUuid: ""});
    const checkpointsFor = (entityName) => entitySyncStatusService.findAll().filtered("entityName = $0", entityName).map(row => row);

    // A device that has synced: every checkpoint the app pulls is at a real date.
    function seedSyncedDevice() {
        EntityMetaData.getEntitiesToBePulled()
            .filter(entity => !entity.privilegeParam)
            .forEach(entity => checkpoint(entity.entityName, `checkpoint-${entity.entityName}`, RECENT));
        create("Concept", {uuid: "concept-1", name: "Weight", datatype: "Numeric", voided: false});
    }

    describe("a catchment reset", () => {
        beforeEach(() => {
            seedSyncedDevice();
            create("ResetSync", {uuid: "reset-1", voided: false, hasMigrated: false});
        });

        it("keeps the ResetSync checkpoint with its uuid and date through the wipe", () => {
            resetSyncService.resetSync();

            const rows = checkpointsFor("ResetSync");
            assert.lengthOf(rows, 1);
            assert.equal(rows[0].uuid, "checkpoint-ResetSync");
            assert.equal(rows[0].loadedSince.getTime(), RECENT.getTime());
        });

        // The first reset must still delete and re-download in full.
        it("still wipes the data and puts every other checkpoint back to the start", () => {
            resetSyncService.resetSync();

            assert.lengthOf(proxy.objects("Concept").map(row => row), 0);
            const concept = checkpointsFor("Concept");
            assert.lengthOf(concept, 1);
            assert.equal(concept[0].loadedSince.getTime(), REALLY_OLD_DATE.getTime());
        });

        it("marks the reset migrated, so the next sync does not run it again", () => {
            resetSyncService.resetSync();

            assert.isFalse(resetSyncService.isResetSyncRequired());
        });
    });

    describe("setting up checkpoints", () => {
        // A restored file carries its own checkpoints. Resetting them would turn the sync
        // after a restore into a full download and throw the restored data's value away.
        it("leaves an existing checkpoint untouched", () => {
            checkpoint("Concept", "restored-concept-checkpoint", RECENT);

            entitySyncStatusService.setup();

            const rows = checkpointsFor("Concept");
            assert.lengthOf(rows, 1);
            assert.equal(rows[0].uuid, "restored-concept-checkpoint");
            assert.equal(rows[0].loadedSince.getTime(), RECENT.getTime());
        });

        it("creates a checkpoint at the start only for an entity that has none", () => {
            checkpoint("Concept", "restored-concept-checkpoint", RECENT);

            entitySyncStatusService.setup();

            const form = checkpointsFor("Form");
            assert.lengthOf(form, 1);
            assert.equal(form[0].loadedSince.getTime(), REALLY_OLD_DATE.getTime());
        });
    });
});
