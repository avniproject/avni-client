/**
 * Uploads that depend on a record from another phone are held until the server has that record.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ClinicHoldBackSqliteTest
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

import {EntityMappingConfig, EntityMetaData} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import EntityService from "../../../src/service/EntityService";
import EntityQueueService from "../../../src/service/EntityQueueService";
import PrivilegeService from "../../../src/service/PrivilegeService";
import SyncService from "../../../src/service/SyncService";
import OrganisationConfigService from "../../../src/service/OrganisationConfigService";
import ClinicRecordService from "../../../src/service/clinicsharing/ClinicRecordService";
import ClinicSpokeService from "../../../src/service/clinicsharing/ClinicSpokeService";
import ClinicHoldBackService from "../../../src/service/clinicsharing/ClinicHoldBackService";
import {open} from "@op-engineering/op-sqlite";

let dbCount = 0;
const at = new Date("2026-10-01T10:00:00.000Z");

function phone({clinicSharing = true} = {}) {
    const rawDb = open({});
    const cfg = EntityMappingConfig.getInstance();
    const tableMetaMap = SchemaGenerator.generateAll(cfg);
    rawDb.executeSync("PRAGMA foreign_keys = OFF");
    for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
    const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));
    const repositoryFactory = new RepositoryFactory(proxy);
    const services = new Map();
    const context = {getRepositoryFactory: () => repositoryFactory, getService: (key) => services.get(key)};
    [
        [EntityService, 'entityService'], [EntityQueueService, 'entityQueueService'], [PrivilegeService, 'privilegeService'],
        [SyncService, 'syncService'], [ClinicRecordService, 'clinicRecordService'], [ClinicSpokeService, 'clinicSpokeService'],
        [ClinicHoldBackService, 'clinicHoldBackService'],
    ].forEach(([cls, name]) => {
        const service = new cls(proxy, context);
        services.set(cls, service);
        services.set(name, service);
    });
    services.set(OrganisationConfigService, {getSettings: () => (clinicSharing ? {enableClinicSharing: true} : {})});
    services.get(ClinicSpokeService).stateName = `clinic_holdback_test_${process.pid}_${dbCount++}.db`;

    const sync = services.get(SyncService);
    const posted = [];
    sync.entityService = services.get(EntityService);
    sync.entityQueueService = services.get(EntityQueueService);
    sync.entitySyncStatusService = {get: () => ({uuid: 'ess-1'})};
    sync.dispatchAction = jest.fn();
    sync.conventionalRestClient = {
        postAllEntities: async (allEntities, onCompleteOfIndividualPost) => {
            for (const {metaData, entities} of allEntities) {
                for (const {resource} of entities) {
                    posted.push(resource);
                    onCompleteOfIndividualPost(metaData, resource.uuid)({});
                }
            }
        },
    };

    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const read = (schema, uuid) => proxy.objects(schema).filtered("uuid = $0", uuid)[0];
    let clock = at.getTime();
    const saveLocally = (schema, data) => {
        create(schema, data);
        create("EntityQueue", {entity: schema, entityUUID: data.uuid, savedAt: new Date(clock += 60000)});
    };

    create("SubjectType", {uuid: "st-person", name: "Person", type: "Person", voided: false});
    create("Gender", {uuid: "female", name: "Female", voided: false});
    create("AddressLevel", {uuid: "village", title: "Village", level: 1, voided: false, type: "Village"});
    create("Program", {uuid: "pr-mother", name: "Mother", voided: false});
    create("EncounterType", {uuid: "et-anc", name: "ANC", voided: false});
    create("Groups", {uuid: "admins", name: "Administrators", hasAllPrivileges: true});
    create("MyGroups", {uuid: "my-admins", groupUuid: "admins", groupName: "Administrators", voided: false});

    const txMetaData = () => EntityMetaData.model().filter((md) => md.type === 'tx');
    return {
        rawDb, create, read, saveLocally, posted, sync, services,
        recordService: services.get(ClinicRecordService),
        holdBack: services.get(ClinicHoldBackService),
        queued: () => proxy.objects("EntityQueue").map((item) => item.entityUUID).sort(),
        push: () => sync.pushData(txMetaData()),
        postedUuids: () => posted.map((r) => r.uuid),
        close: async () => { (await services.get(ClinicSpokeService)._state()).close(); rawDb.close(); },
    };
}

const patient = (uuid, firstName = "Sunita") => ({uuid, firstName, lastName: "Devi", dateOfBirth: new Date("1994-03-02"), registrationDate: new Date("2026-10-01"),
    subjectType: {uuid: "st-person"}, gender: {uuid: "female"}, lowestAddressLevel: {uuid: "village"}, observations: [], voided: false});
const visit = (uuid, individualUUID, extra = {}) => ({uuid, encounterType: {uuid: "et-anc"}, individual: {uuid: individualUUID}, encounterDateTime: at,
    observations: [], cancelObservations: [], voided: false, ...extra});

// Another phone's records, as they arrive from the hub.
function fromAnotherPhone(entityName, schema, data) {
    const other = phone();
    other.create(schema, data);
    const resource = other.recordService.toSharedResource(entityName, other.read(schema, data.uuid));
    other.rawDb.close();
    return JSON.parse(JSON.stringify(resource));
}

const pulled = (entityName) => ({...EntityMetaData.findByName(entityName), syncStatus: {entityTypeUuid: ''}});

// The same record as server sync would download it.
function fromServer(recordService, entityName, resource, extra = {}) {
    return {...recordService._adaptResource(entityName, resource), lastModifiedDateTime: "2026-10-03T09:00:00.000Z", ...extra};
}

describe("Holding back uploads that depend on another phone", () => {
    let mine;
    const log = () => {};
    const receivePatient = () => mine.recordService.applyBatches([{entityName: 'Individual', resources: [fromAnotherPhone('Individual', 'Individual', patient('p-1'))]}], log);

    beforeEach(() => { mine = phone(); });
    afterEach(async () => { await mine.close(); });

    it("uploads everything except a visit on a patient another phone registered, and keeps that visit queued", async () => {
        await receivePatient();
        mine.saveLocally("Encounter", visit("v-1", "p-1"));
        mine.saveLocally("Individual", patient("own-1", "Kamla"));

        await mine.push();

        expect(mine.postedUuids()).toEqual(["own-1"]);
        expect(mine.queued()).toEqual(["v-1"]);
    });

    it("holds a whole chain made on a received patient: enrolment, then a visit in it", async () => {
        await receivePatient();
        mine.saveLocally("ProgramEnrolment", {uuid: "enl-1", program: {uuid: "pr-mother"}, individual: {uuid: "p-1"}, enrolmentDateTime: at,
            observations: [], programExitObservations: [], voided: false});
        mine.saveLocally("ProgramEncounter", {uuid: "pe-1", encounterType: {uuid: "et-anc"}, programEnrolment: {uuid: "enl-1"}, encounterDateTime: at,
            observations: [], cancelObservations: [], voided: false});

        await mine.push();

        expect(mine.postedUuids()).toEqual([]);
        const held = await mine.holdBack.getHeldUploads();
        expect(held.items.map(({uuid, waitingOn}) => [uuid, waitingOn]).sort()).toEqual([["enl-1", "p-1"], ["pe-1", "p-1"]]);
    });

    it("releases the visit once the patient comes down from the server, and uploads it in the same sync", async () => {
        const sent = fromAnotherPhone('Individual', 'Individual', patient('p-1'));
        await mine.recordService.applyBatches([{entityName: 'Individual', resources: [sent]}], log);
        mine.saveLocally("Encounter", visit("v-1", "p-1"));
        await mine.push();

        await mine.sync.persistAll(pulled('Individual'), [fromServer(mine.recordService, 'Individual', sent)]);
        await mine.sync._pushReleasedHoldBacks(EntityMetaData.model().filter((md) => md.type === 'tx'));

        expect(mine.postedUuids()).toEqual(["v-1"]);
        expect(mine.queued()).toEqual([]);
        expect((await mine.holdBack.getHeldUploads()).count).toBe(0);
    });

    it("keeps the doctor's edit to a received visit when the nurse's copy comes down, then uploads the edit", async () => {
        await receivePatient();
        const nurses = fromAnotherPhone('Encounter', 'Encounter', visit("v-1", "p-1", {name: "nurse"}));
        await mine.recordService.applyBatches([{entityName: 'Encounter', resources: [nurses]}], log);
        mine.saveLocally("Encounter", visit("v-1", "p-1", {name: "doctor"}));
        await mine.push();
        expect(mine.postedUuids()).toEqual([]);

        await mine.sync.persistAll(pulled('Encounter'), [fromServer(mine.recordService, 'Encounter', nurses)]);
        await mine.sync.persistAll(pulled('Individual'),
            [fromServer(mine.recordService, 'Individual', fromAnotherPhone('Individual', 'Individual', patient('p-1')))]);
        await mine.sync._pushReleasedHoldBacks(EntityMetaData.model().filter((md) => md.type === 'tx'));

        expect(mine.read("Encounter", "v-1").name).toBe("doctor");
        expect(mine.posted.map((r) => [r.uuid, r.name])).toEqual([["v-1", "doctor"]]);
    });

    it("does not hold this phone's own unsent record when another phone's edit of it comes back through the hub", async () => {
        mine.saveLocally("Individual", patient("own-1", "Kamla"));
        const edited = fromAnotherPhone('Individual', 'Individual', patient("own-1", "Kamla Bai"));
        await mine.recordService.applyBatches([{entityName: 'Individual', resources: [edited]}], log);

        await mine.push();

        expect(mine.posted.map((r) => [r.uuid, r.firstName])).toEqual([["own-1", "Kamla Bai"]]);
    });

    it("reports what is held, since when, and what it waits on", async () => {
        await receivePatient();
        mine.saveLocally("Individual", patient("own-1", "Kamla"));
        mine.saveLocally("Encounter", visit("v-1", "p-1"));
        mine.saveLocally("Encounter", visit("v-2", "p-1"));

        const held = await mine.holdBack.getHeldUploads();

        expect(held.count).toBe(2);
        expect(held.items).toEqual([
            {entityType: "Encounter", uuid: "v-1", waitingOn: "p-1"},
            {entityType: "Encounter", uuid: "v-2", waitingOn: "p-1"},
        ]);
        expect(held.oldest.toISOString()).toBe(new Date(at.getTime() + 2 * 60000).toISOString());
    });

    it("changes nothing for an organisation not using clinic sharing", async () => {
        const plain = phone({clinicSharing: false});
        const holdBackState = jest.spyOn(plain.holdBack, 'receivedUuids');
        plain.saveLocally("Individual", patient("own-1", "Kamla"));
        plain.saveLocally("Encounter", visit("v-1", "own-1"));

        await plain.push();
        await plain.sync.persistAll(pulled('Individual'),
            [fromServer(plain.recordService, 'Individual', fromAnotherPhone('Individual', 'Individual', patient('p-9')))]);

        expect(plain.postedUuids()).toEqual(["own-1", "v-1"]);
        expect(holdBackState).not.toHaveBeenCalled();
        plain.rawDb.close();
    });
});
