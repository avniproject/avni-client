/**
 * The bulky kinds of record saved straight from the download (#2145), against today's path on the same data.
 *
 * Run: npx jest --selectProjects integration --testPathPattern SyncServiceDirectRowsTest
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

import _ from "lodash";
import {EntityMetaData} from "openchs-models";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import EntityService from "../../../src/service/EntityService";
import SyncService from "../../../src/service/SyncService";
import OrganisationConfigService from "../../../src/service/OrganisationConfigService";
import General from "../../../src/utility/General";
import SqliteRowMapper from "../../../src/framework/db/SqliteRowMapper";
import {jsonArrayListPropFor} from "../../../src/framework/db/SchemaGenerator";
import {openSeededDb} from "../framework/db/lazyFixture";
import {EXTRA_SEED, approvalResource, encounterResource, individualResource} from "../framework/db/syncResourceFixtures";

function phone(settings) {
    const db = openSeededDb(EXTRA_SEED);
    const repositoryFactory = new RepositoryFactory(db.proxy);
    const services = new Map();
    const context = {getRepositoryFactory: () => repositoryFactory, getService: (key) => services.get(key)};
    const entityService = new EntityService(db.proxy, context);
    const sync = new SyncService(db.proxy, context);
    [[EntityService, "entityService", entityService], [SyncService, "syncService", sync]].forEach(([cls, name, service]) => {
        services.set(cls, service);
        services.set(name, service);
    });
    services.set(OrganisationConfigService, {getSettings: () => settings});
    sync.entityService = entityService;
    sync.entitySyncStatusService = {get: () => ({uuid: "ess-1"})};
    sync.dispatchAction = jest.fn();
    return {...db, sync};
}

const pulled = (entityName) => ({...EntityMetaData.findByName(entityName), syncStatus: {entityTypeUuid: ""}});
const rowOf = (db, table, uuid) => db.rowsOf(table).find((row) => row.uuid === uuid);
// The save step's own debug line says which way a page went. A spy on bulkInsertRows would not: bulkCreate calls it too.
const loggedStraightFromDownload = (debug) => debug.mock.calls.some(([source, message]) => source === "SyncService" && _.endsWith(message, "rows straight from the download"));

describe("Saving the bulky kinds of record straight from the download", () => {
    let on, off;

    beforeEach(() => {
        on = phone({enableDirectSyncRows: true});
        off = phone({});
    });

    afterEach(() => {
        on.rawDb.close();
        off.rawDb.close();
    });

    const pullOnBoth = async (entityName, makePage) => {
        const debug = jest.spyOn(General, "logDebug");
        try {
            await on.sync.persistAll(pulled(entityName), makePage());
            expect(loggedStraightFromDownload(debug)).toBe(true);
            debug.mockClear();
            await off.sync.persistAll(pulled(entityName), makePage());
            expect(loggedStraightFromDownload(debug)).toBe(false);
        } finally {
            debug.mockRestore();
        }
    };

    it("writes the same subject rows as today's path when every parent is on the phone", async () => {
        await pullOnBoth("Individual", () => [individualResource({uuid: "ind-new-1"}), individualResource({uuid: "ind-new-2", middleName: null})]);

        expect(on.rowsOf("individual")).toEqual(off.rowsOf("individual"));
    });

    it("keeps the uuid of a subject that is not on the phone, where today's path leaves the link empty", async () => {
        await pullOnBoth("Encounter", () => [encounterResource({uuid: "enc-new"}, {individualUUID: "ind-not-on-phone"})]);

        expect(rowOf(off, "encounter", "enc-new").individual_uuid).toBeNull();
        expect(rowOf(on, "encounter", "enc-new")).toEqual({...rowOf(off, "encounter", "enc-new"), individual_uuid: "ind-not-on-phone"});
    });

    it.each([[{}], [{enableDirectSyncRows: false}], [{enableDirectSyncRows: "true"}], [{enableDirectSyncRows: 1}]])(
        "keeps today's path when the organisation setting is %j", async (settings) => {
            const db = phone(settings);

            await db.sync.persistAll(pulled("Encounter"), [encounterResource({uuid: "enc-new"}, {individualUUID: "ind-not-on-phone"})]);

            expect(rowOf(db, "encounter", "enc-new").individual_uuid).toBeNull();
            db.rawDb.close();
        });

    it("sets the subject's latest approval from the rows, as today", async () => {
        await pullOnBoth("SubjectEntityApprovalStatus", () => [approvalResource({uuid: "eas-new", statusDateTime: "2026-09-05T00:00:00.000Z"}, {entityUUID: "ind-1"})]);

        expect(rowOf(on, "individual", "ind-1").latest_entity_approval_status_uuid).toBe("eas-new");
        expect(on.rowsOf("individual")).toEqual(off.rowsOf("individual"));
        expect(on.rowsOf("entity_approval_status")).toEqual(off.rowsOf("entity_approval_status"));
    });

    it("leaves a link only the phone keeps untouched when a record comes down again", async () => {
        await pullOnBoth("Encounter", () => [encounterResource({uuid: "enc-1a", name: "edited"}, {individualUUID: "ind-1"})]);

        expect(rowOf(on, "encounter", "enc-1a").latest_entity_approval_status_uuid).toBe("eas-1a");
        expect(on.rowsOf("encounter")).toEqual(off.rowsOf("encounter"));
    });

    it("moves the sync watermark and reports the page, as today", async () => {
        await pullOnBoth("Individual", () => [individualResource({uuid: "ind-new-1"})]);

        expect(on.rowsOf("entity_sync_status")).toEqual(off.rowsOf("entity_sync_status"));
        expect(on.rowsOf("entity_sync_status")).toHaveLength(1);
        expect(on.sync.dispatchAction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({entityName: "Individual", numberOfPulledEntities: 1}));
    });

    it("never takes the new path on the old database", () => {
        on.sync.db = {isSqlite: false, bulkInsertRows: () => Promise.resolve()};

        expect(on.sync._writesRowsDirectly(pulled("Individual"))).toBe(false);
    });

    it("leaves every other kind of record on today's path", () => {
        ["GroupSubject", "SubjectMigration", "ResetSync", "TaskUnAssignment", "UserSubjectAssignment", "Concept", "Comment"].forEach((name) => {
            expect(EntityMetaData.findByName(name)).toBeDefined();
            expect(on.sync._writesRowsDirectly(pulled(name))).toBe(false);
        });
    });

    it("covers no kind whose parent keeps its children in a list on its own row", () => {
        const covered = EntityMetaData.model().filter((md) => SqliteRowMapper.covers(md.schemaName) && !_.isEmpty(md.parent));
        expect(covered.length).toBeGreaterThan(0);
        covered.forEach((md) => expect(jsonArrayListPropFor(md.parent.schemaName, md.schemaName)).toBeFalsy());
    });

    it("fails a page with an answer to a question not on the phone the same way on both paths", async () => {
        const page = () => [individualResource({uuid: "ind-new-1", observations: {"c-not-on-phone": 1}})];
        const todayError = await off.sync.persistAll(pulled("Individual"), page()).then(() => null, (error) => error);
        const directError = await on.sync.persistAll(pulled("Individual"), page()).then(() => null, (error) => error);

        expect(todayError).toBeInstanceOf(TypeError);
        expect(directError).toBeInstanceOf(TypeError);
        expect(directError.message).toBe(todayError.message);
        expect(on.rowsOf("individual").some((row) => row.uuid === "ind-new-1")).toBe(false);
    });
});
