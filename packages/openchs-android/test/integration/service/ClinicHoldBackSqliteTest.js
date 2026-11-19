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

import {Encounter, EntityMappingConfig, EntityMetaData} from "openchs-models";
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
import ClinicMediaService from "../../../src/service/clinicsharing/ClinicMediaService";
import ClinicParkedRecordService from "../../../src/service/clinicsharing/ClinicParkedRecordService";
import MediaQueueService from "../../../src/service/MediaQueueService";
import EncounterService from "../../../src/service/EncounterService";
import ErrorUtil from "../../../src/framework/errorHandling/ErrorUtil";
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
        [ClinicHoldBackService, 'clinicHoldBackService'], [ClinicMediaService, 'clinicMediaService'], [MediaQueueService, 'mediaQueueService'],
        [EncounterService, 'encounterService'], [ClinicParkedRecordService, 'clinicParkedRecordService'],
    ].forEach(([cls, name]) => {
        const service = new cls(proxy, context);
        services.set(cls, service);
        services.set(name, service);
    });
    services.set('clinicHubService', {mirrorOwnQueue: async () => {}});
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
    create("ApprovalStatus", {uuid: "approved", status: "Approved", voided: false});
    create("Concept", {uuid: "c-photo", name: "Photo", datatype: "Image", voided: false});
    create("Concept", {uuid: "c-photo-2", name: "Second photo", datatype: "Image", voided: false});
    create("Concept", {uuid: "c-group", name: "Photos group", datatype: "QuestionGroup", voided: false});
    create("Concept", {uuid: "c-repeat", name: "Repeated photos", datatype: "QuestionGroup", voided: false});
    create("Groups", {uuid: "admins", name: "Administrators", hasAllPrivileges: true});
    create("MyGroups", {uuid: "my-admins", groupUuid: "admins", groupName: "Administrators", voided: false});

    const txMetaData = () => EntityMetaData.model().filter((md) => md.type === 'tx');
    return {
        rawDb, create, read, saveLocally, posted, sync, services,
        recordService: services.get(ClinicRecordService),
        holdBack: services.get(ClinicHoldBackService),
        queued: () => proxy.objects("EntityQueue").map((item) => item.entityUUID).sort(),
        queuedMedia: () => proxy.objects("MediaQueue").map((item) => item.fileName).sort(),
        queueMediaOf: (schema, uuid) => services.get(MediaQueueService).addMediaToQueue(read(schema, uuid), schema),
        media: services.get(ClinicMediaService),
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

    it("does not hold visits on a patient this phone already has from the server when the hub serves it again, as after a hub restart", async () => {
        const shared = fromAnotherPhone('Individual', 'Individual', patient('p-1'));
        await mine.sync.persistAll(pulled('Individual'), [fromServer(mine.recordService, 'Individual', shared)]);

        await mine.recordService.applyBatches([{entityName: 'Individual', resources: [shared]}], log);
        mine.saveLocally("Encounter", visit("v-1", "p-1"));
        await mine.push();

        expect(mine.postedUuids()).toEqual(["v-1"]);
    });

    it("does not wait for another phone's approval to come down, while still holding this phone's approval of a received patient", async () => {
        const approval = (uuid) => ({uuid, entityUUID: "p-1", entityType: "Subject", entityTypeUuid: "st-person", approvalStatus: {uuid: "approved"},
            statusDateTime: at, autoApproved: false, voided: false});
        await receivePatient();
        await mine.recordService.applyBatches([{entityName: 'EntityApprovalStatus',
            resources: [fromAnotherPhone('EntityApprovalStatus', 'EntityApprovalStatus', approval("eas-theirs"))]}], log);
        mine.saveLocally("EntityApprovalStatus", approval("eas-mine"));

        await mine.push();

        expect([...await mine.holdBack.receivedUuids()]).toEqual(["p-1"]);
        expect(mine.queued()).toEqual(["eas-mine"]);
    });

    it("reports what is held, since the first server sync that held it, and what it waits on", async () => {
        await receivePatient();
        mine.saveLocally("Individual", patient("own-1", "Kamla"));
        mine.saveLocally("Encounter", visit("v-1", "p-1"));
        mine.saveLocally("Encounter", visit("v-2", "p-1"));
        expect((await mine.holdBack.getHeldUploads()).oldest).toBeNull();

        const before = Date.now();
        await mine.push();
        const held = await mine.holdBack.getHeldUploads();

        expect(held.count).toBe(2);
        expect(held.items).toEqual([
            {entityType: "Encounter", uuid: "v-1", waitingOn: "p-1"},
            {entityType: "Encounter", uuid: "v-2", waitingOn: "p-1"},
        ]);
        expect(held.oldest.getTime()).toBeGreaterThanOrEqual(before);
    });

    it("says whether this phone holds records from other phones, counting only those still on it", async () => {
        expect(await mine.holdBack.hasRecordsFromOtherPhones()).toBe(false);
        await receivePatient();
        expect(await mine.holdBack.hasRecordsFromOtherPhones()).toBe(true);

        await mine.holdBack.release(["p-1"]);
        expect(await mine.holdBack.hasRecordsFromOtherPhones()).toBe(false);

        const db = await mine.holdBack._state();
        await db.execute("insert into received_from_peer (uuid, entity_type, received_at) values ('wiped-by-reset', 'Individual', 1)");
        expect(await mine.holdBack.hasRecordsFromOtherPhones()).toBe(false);
    });

    describe("an upload that has waited 3 days", () => {
        const DAY = 24 * 60 * 60 * 1000;
        const savedAt = () => mine.services.get(EntityQueueService).findAll("EntityQueue").map((item) => item.savedAt.getTime())[0];
        const heldAt = async () => (await mine.holdBack.getHeldUploads()).oldest.getTime();
        let reports;
        beforeEach(() => { reports = jest.spyOn(ErrorUtil, 'notifyBugsnag').mockImplementation(async () => {}); });
        afterEach(() => reports.mockRestore());

        it("is reported, naming the patient it waits on", async () => {
            await receivePatient();
            mine.saveLocally("Encounter", visit("v-1", "p-1"));
            await mine.push();

            expect(await mine.holdBack.reportLongWaiting(await heldAt() + 3 * DAY + 60000)).toBe(1);

            expect(reports).toHaveBeenCalledTimes(1);
            expect(reports.mock.calls[0][0].message).toBe("ClinicSharingHeldUpload: Encounter v-1 has waited 3 days for p-1");
            expect(reports.mock.calls[0][1]).toBe("ClinicSharingHeldUpload");
        });

        it("is reported once, however many syncs follow", async () => {
            await receivePatient();
            mine.saveLocally("Encounter", visit("v-1", "p-1"));
            await mine.push();

            await mine.holdBack.reportLongWaiting(await heldAt() + 3 * DAY + 60000);
            await mine.push();
            expect(await mine.holdBack.reportLongWaiting(await heldAt() + 5 * DAY)).toBe(0);

            expect(reports).toHaveBeenCalledTimes(1);
        });

        it("is not reported before 3 days", async () => {
            await receivePatient();
            mine.saveLocally("Encounter", visit("v-1", "p-1"));
            await mine.push();

            expect(await mine.holdBack.reportLongWaiting(await heldAt() + 3 * DAY - 60 * 60 * 1000)).toBe(0);

            expect(reports).not.toHaveBeenCalled();
        });

        it("counts from the first server sync that held it, so a camp of several days does not report it at once", async () => {
            await receivePatient();
            mine.saveLocally("Encounter", visit("v-1", "p-1"));

            expect(await mine.holdBack.reportLongWaiting(savedAt() + 4 * DAY)).toBe(0);
            await mine.push();
            expect(await mine.holdBack.reportLongWaiting(await heldAt() + DAY)).toBe(0);
            expect(await mine.holdBack.reportLongWaiting(await heldAt() + 3 * DAY + 60000)).toBe(1);

            expect(reports).toHaveBeenCalledTimes(1);
        });
    });

    describe("when a reset is due", () => {
        const txMetaData = () => EntityMetaData.model().filter((md) => md.type === 'tx');
        const queuedParentsFirst = () => txMetaData().reverse()
            .map((metaData) => mine.sync.entityQueueService.getAllQueuedItems(metaData))
            .filter(({entities}) => entities.length > 0);
        const uuidsOf = (entitiesToPost) => entitiesToPost.flatMap(({entities}) => entities.map(({resource}) => resource.uuid));

        it("offers the uploads waiting on a parent, and not this phone's edits of another phone's records", async () => {
            await receivePatient();
            await mine.recordService.applyBatches([{entityName: 'Encounter',
                resources: [fromAnotherPhone('Encounter', 'Encounter', visit("v-nurse", "p-1", {name: "nurse"}))]}], log);
            mine.saveLocally("Encounter", visit("v-1", "p-1"));
            mine.saveLocally("Encounter", visit("v-nurse", "p-1", {name: "doctor"}));

            expect(uuidsOf(await mine.holdBack.heldToTry(queuedParentsFirst()))).toEqual(["v-1"]);
        });

        it("offers a whole chain made on a received patient, parents first", async () => {
            await receivePatient();
            mine.saveLocally("ProgramEnrolment", enrolment("enl-1", "p-1"));
            mine.saveLocally("ProgramEncounter", {uuid: "pe-1", encounterType: {uuid: "et-anc"}, programEnrolment: {uuid: "enl-1"}, encounterDateTime: at,
                observations: [], cancelObservations: [], voided: false});

            expect(uuidsOf(await mine.holdBack.heldToTry(queuedParentsFirst()))).toEqual(["enl-1", "pe-1"]);
        });

        it("does not offer a reply in another phone's comment thread, which the server would save without its thread", async () => {
            mine.create("Individual", patient("own-1", "Kamla"));
            const thread = {uuid: "th-1", status: "Open", openDateTime: at, voided: false};
            await mine.recordService.applyBatches([{entityName: 'CommentThread', resources: [fromAnotherPhone('CommentThread', 'CommentThread', thread)]}], log);
            mine.saveLocally("Comment", {uuid: "cm-1", text: "Reply", subject: {uuid: "own-1"}, commentThread: {uuid: "th-1"}, displayUsername: "doctor",
                createdByUsername: "doctor", createdDateTime: at, lastModifiedDateTime: at, voided: false});

            expect((await mine.holdBack.getHeldUploads()).items.map(({uuid}) => uuid)).toEqual(["cm-1"]);
            expect(uuidsOf(await mine.holdBack.heldToTry(queuedParentsFirst()))).toEqual([]);
        });

        it("keeps what the server took before a refusal, and deletes nothing", async () => {
            await receivePatient();
            await mine.recordService.applyBatches([{entityName: 'Individual', resources: [fromAnotherPhone('Individual', 'Individual', patient('p-2'))]}], log);
            mine.saveLocally("Encounter", visit("v-1", "p-1"));
            mine.saveLocally("Encounter", visit("v-2", "p-2"));
            const refuseV2 = mine.sync.conventionalRestClient.postAllEntities;
            mine.sync.conventionalRestClient.postAllEntities = async (allEntities, onCompleteOfIndividualPost, onComplete) => {
                const accepted = allEntities.map(({metaData, entities}) => ({metaData, entities: entities.filter(({resource}) => resource.uuid !== "v-2")}));
                await refuseV2(accepted, onCompleteOfIndividualPost, onComplete);
                if (uuidsOf(allEntities).includes("v-2")) throw new Error("Http 500: Individual not found");
            };

            expect(await mine.sync._tryHeldUploads(txMetaData())).toBe(false);

            expect(mine.postedUuids()).toEqual(["v-1"]);
            expect(mine.queued()).toEqual(["v-2"]);
        });

        it("reports nothing waiting once the server takes every offered upload", async () => {
            await receivePatient();
            mine.saveLocally("Encounter", visit("v-1", "p-1"));

            expect(await mine.sync._tryHeldUploads(txMetaData())).toBe(true);

            expect(mine.queued()).toEqual([]);
        });
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

const NURSE_PHOTO = "11111111-1111-4111-8111-111111111111.jpg";
const DOCTOR_PHOTO = "22222222-2222-4222-8222-222222222222.jpg";
const photos = (first, second) => [
    {concept: {uuid: "c-photo"}, valueJSON: JSON.stringify({answer: first})},
    ...(second ? [{concept: {uuid: "c-photo-2"}, valueJSON: JSON.stringify({answer: second})}] : []),
];
const answerOf = (encounter, conceptUUID) => JSON.parse(encounter.observations.find((o) => o.concept.uuid === conceptUUID).valueJSON).answer;
const enrolment = (uuid, individualUUID, extra = {}) => ({uuid, program: {uuid: "pr-mother"}, individual: {uuid: individualUUID}, enrolmentDateTime: at,
    observations: [], programExitObservations: [], voided: false, ...extra});
const photoInGroup = (fileName) => ({concept: {uuid: "c-photo", name: "Photo", datatype: "Image"}, valueJSON: {answer: fileName}});
const groupPhoto = (fileName) => ({concept: {uuid: "c-group"}, valueJSON: JSON.stringify({groupObservations: [photoInGroup(fileName)]})});
const repeatableGroupPhoto = (fileName) => ({concept: {uuid: "c-repeat"},
    valueJSON: JSON.stringify({repeatableObservations: [{groupObservations: [photoInGroup(fileName)]}]})});

describe("Photos in records from another phone", () => {
    let mine;
    const log = () => {};
    const receive = (entityName, data) => mine.recordService.applyBatches([{entityName, resources: [fromAnotherPhone(entityName, entityName, data)]}], log);

    beforeEach(async () => {
        mine = phone();
        await receive('Individual', patient('p-1'));
    });
    afterEach(async () => { await mine.close(); });

    it("are not queued for upload when this phone saves the record, while a photo this phone adds is", async () => {
        await receive('Encounter', visit("v-1", "p-1", {observations: photos(NURSE_PHOTO)}));

        mine.saveLocally("Encounter", visit("v-1", "p-1", {observations: photos(NURSE_PHOTO, DOCTOR_PHOTO)}));
        mine.queueMediaOf("Encounter", "v-1");

        expect(mine.queuedMedia()).toEqual([DOCTOR_PHOTO]);
    });

    it("take the server's link into a kept local edit, so the edit's upload doesn't replace the link", async () => {
        await receive('Encounter', visit("v-1", "p-1", {name: "nurse", observations: photos(NURSE_PHOTO)}));
        mine.saveLocally("Encounter", visit("v-1", "p-1", {name: "doctor", observations: photos(NURSE_PHOTO, DOCTOR_PHOTO)}));
        await mine.push();

        const nurseLink = `https://s3.example.org/org-1/${NURSE_PHOTO}`;
        const uploaded = fromAnotherPhone('Encounter', 'Encounter', visit("v-1", "p-1", {name: "nurse", observations: photos(nurseLink)}));
        await mine.sync.persistAll(pulled('Encounter'), [fromServer(mine.recordService, 'Encounter', uploaded)]);
        await mine.sync.persistAll(pulled('Individual'), [fromServer(mine.recordService, 'Individual', fromAnotherPhone('Individual', 'Individual', patient('p-1')))]);
        await mine.sync._pushReleasedHoldBacks(EntityMetaData.model().filter((md) => md.type === 'tx'));

        const local = mine.read("Encounter", "v-1");
        expect([local.name, answerOf(local, "c-photo"), answerOf(local, "c-photo-2")]).toEqual(["doctor", nurseLink, DOCTOR_PHOTO]);
        const posted = mine.posted.find((r) => r.uuid === "v-1");
        expect(posted.observations.map((o) => [o.conceptUUID, o.value])).toEqual([["c-photo", nurseLink], ["c-photo-2", DOCTOR_PHOTO]]);
    });

    it("keep this phone's own photo, and its link, when another phone's older copy of the record arrives with the bare name", async () => {
        mine.saveLocally("Encounter", visit("v-1", "p-1", {name: "nurse", observations: photos(NURSE_PHOTO)}));
        mine.queueMediaOf("Encounter", "v-1");
        const nurseLink = `https://s3.example.org/org-1/${NURSE_PHOTO}`;
        // The nurse's upload: the photo leaves her queue and her visit takes its link.
        mine.services.get(MediaQueueService).replaceMediaValue({entityUUID: "v-1", entityName: "Encounter", fileName: NURSE_PHOTO,
            entityTargetField: "observations", conceptUUID: "c-photo"}, nurseLink);
        mine.rawDb.executeSync("DELETE FROM media_queue");

        await receive('Encounter', visit("v-1", "p-1", {name: "doctor", observations: photos(NURSE_PHOTO)}));

        const local = mine.read("Encounter", "v-1");
        expect([local.name, answerOf(local, "c-photo")]).toEqual(["doctor", nurseLink]);
        expect(mine.media.isFromAnotherPhone(NURSE_PHOTO)).toBe(false);
    });

    it("stay this phone's own when its photo comes back in another phone's edit", async () => {
        mine.saveLocally("Encounter", visit("v-own", "p-1", {observations: photos(DOCTOR_PHOTO)}));
        mine.queueMediaOf("Encounter", "v-own");

        await receive('Encounter', visit("v-own", "p-1", {observations: photos(DOCTOR_PHOTO, NURSE_PHOTO)}));

        expect([mine.media.isFromAnotherPhone(DOCTOR_PHOTO), mine.media.isFromAnotherPhone(NURSE_PHOTO)]).toEqual([false, true]);
    });

    describe("keep their link when another phone's copy arrives with the bare name", () => {
        const link = `https://s3.example.org/org-1/${NURSE_PHOTO}`;
        // As after this phone's upload: the local copy holds the link and nothing is queued.
        const uploadedLocally = (schema, data) => {
            mine.saveLocally(schema, data);
            mine.rawDb.executeSync("DELETE FROM entity_queue");
        };

        it("on a programme exit form, saved as text the exit screen can read", async () => {
            uploadedLocally("ProgramEnrolment", enrolment("e-1", "p-1", {observations: photos(link), programExitObservations: photos(link)}));

            await receive('ProgramEnrolment', enrolment("e-1", "p-1", {observations: photos(NURSE_PHOTO), programExitObservations: photos(NURSE_PHOTO)}));

            const local = mine.read("ProgramEnrolment", "e-1");
            expect([...local.programExitObservations].map((o) => typeof o.valueJSON)).toEqual(["string"]);
            expect([JSON.parse(local.programExitObservations[0].valueJSON).answer, answerOf(local, "c-photo")]).toEqual([link, link]);
        });

        it("inside a question group", async () => {
            uploadedLocally("Encounter", visit("v-1", "p-1", {observations: [groupPhoto(link)]}));

            await receive('Encounter', visit("v-1", "p-1", {observations: [groupPhoto(NURSE_PHOTO)]}));

            const group = JSON.parse(mine.read("Encounter", "v-1").observations[0].valueJSON);
            expect(group.groupObservations[0].valueJSON.answer).toEqual(link);
        });

        it("inside a repeatable question group", async () => {
            uploadedLocally("Encounter", visit("v-1", "p-1", {observations: [repeatableGroupPhoto(link)]}));

            await receive('Encounter', visit("v-1", "p-1", {observations: [repeatableGroupPhoto(NURSE_PHOTO)]}));

            const repeats = JSON.parse(mine.read("Encounter", "v-1").observations[0].valueJSON);
            expect(repeats.repeatableObservations[0].groupObservations[0].valueJSON.answer).toEqual(link);
        });
    });

    it("are queued as today for an organisation not using clinic sharing", async () => {
        const plain = phone({clinicSharing: false});
        await plain.recordService.applyBatches([{entityName: 'Individual', resources: [fromAnotherPhone('Individual', 'Individual', patient('p-1'))]}], log);
        await plain.recordService.applyBatches([{entityName: 'Encounter',
            resources: [fromAnotherPhone('Encounter', 'Encounter', visit("v-1", "p-1", {observations: photos(NURSE_PHOTO)}))]}], log);

        plain.queueMediaOf("Encounter", "v-1");

        expect(plain.queuedMedia()).toEqual([NURSE_PHOTO]);
        await plain.close();
    });
});

describe("Records that arrive before their parent", () => {
    let mine, reports;
    const log = () => {};
    const receive = (entityName, data) => mine.recordService.applyBatches([{entityName, resources: [fromAnotherPhone(entityName, entityName, data)]}], log);
    const parked = () => mine.services.get(ClinicSpokeService).stateDb.executeSync("SELECT uuid FROM parked_records ORDER BY uuid").rows.map((r) => r.uuid);
    const parkedRecords = () => mine.services.get('clinicParkedRecordService');
    const visitParent = (uuid) => mine.rawDb.executeSync("SELECT individual_uuid AS parent FROM encounter WHERE uuid = ?", [uuid]).rows.map((r) => r.parent);

    beforeEach(() => {
        mine = phone();
        reports = jest.spyOn(ErrorUtil, 'notifyBugsnag').mockImplementation(async () => {});
    });
    afterEach(async () => {
        reports.mockRestore();
        await mine.close();
    });

    it("wait for the patient from a later hub sync, then appear linked to it, without a report", async () => {
        await receive('Encounter', visit("v-1", "p-1"));
        expect([visitParent("v-1"), parked()]).toEqual([[], ["v-1"]]);

        const nextSyncStartedAt = Date.now();
        await receive('Individual', patient('p-1'));
        await parkedRecords().afterSync(nextSyncStartedAt, log);

        expect([visitParent("v-1"), parked()]).toEqual([["p-1"], []]);
        expect(reports).not.toHaveBeenCalled();
    });

    // After a camp the visit's own phone uploads it, and it comes down from the server like any other record.
    it("are dropped at the server sync after a camp, without a report when the patient has come down", async () => {
        await receive('Encounter', visit("v-1", "p-1"));

        await mine.sync.persistAll(pulled('Individual'), [fromServer(mine.recordService, 'Individual', fromAnotherPhone('Individual', 'Individual', patient('p-1')))]);
        await mine.sync._dropParkedClinicRecords();

        expect([mine.read("Encounter", "v-1") ?? null, parked()]).toEqual([null, []]);
        expect(reports).not.toHaveBeenCalled();
    });

    it("are reported at the server sync after a camp when their patient still has not come down, then dropped", async () => {
        await receive('Encounter', visit("v-1", "p-missing"));

        await mine.sync._dropParkedClinicRecords();

        expect(reports).toHaveBeenCalledTimes(1);
        expect(reports.mock.calls[0][0].message).toBe("ClinicSharingOrphan: Encounter v-1 is still missing its parent Individual p-missing");
        expect(parked()).toEqual([]);
    });

    it("are reported once, with type and IDs only, when still waiting after a sync that began after they arrived", async () => {
        const arrivedAt = Date.now();
        await receive('Encounter', visit("v-1", "p-missing", {name: "Sunita's visit"}));

        await parkedRecords().afterSync(arrivedAt - 1, log);
        expect(reports).not.toHaveBeenCalled();

        await parkedRecords().afterSync(Date.now() + 1, log);
        await parkedRecords().afterSync(Date.now() + 2, log);

        expect(reports).toHaveBeenCalledTimes(1);
        const [error, source] = reports.mock.calls[0];
        expect(source).toBe("ClinicSharingOrphan");
        expect(error.message).toBe("ClinicSharingOrphan: Encounter v-1 is still missing its parent Individual p-missing");
        expect(parked()).toEqual(["v-1"]);
    });

    // A server sync runs only outside a camp, so the server's copy is the newest: a waiting copy must not go on top of it.
    it("leave the server's copy in place at the server sync after a camp, so an older waiting copy never replaces a newer one", async () => {
        await receive('Encounter', visit("v-1", "p-1", {name: "edited on phone A during the camp"}));
        const serverVisit = fromAnotherPhone('Encounter', 'Encounter', visit("v-1", "p-1", {name: "edited again on the web after the camp"}));

        await mine.sync.persistAll(pulled('Individual'), [fromServer(mine.recordService, 'Individual', fromAnotherPhone('Individual', 'Individual', patient('p-1')))]);
        await mine.sync.persistAll(pulled('Encounter'), [fromServer(mine.recordService, 'Encounter', serverVisit)]);
        await mine.sync._dropParkedClinicRecords();

        expect([mine.read("Encounter", "v-1").name, visitParent("v-1"), parked()]).toEqual(["edited again on the web after the camp", ["p-1"], []]);
    });

    it("on the hub, go into the ledger under the phone that sent them once applied, for phones whose cursor has passed", async () => {
        const hub = {_appendLedgerRows: jest.fn(async () => {})};
        mine.services.set('clinicHubService', hub);
        await mine.recordService.applyBatches([{entityName: 'Encounter', resources: [fromAnotherPhone('Encounter', 'Encounter', visit("v-1", "p-1"))]}], log, 'phone-a');

        await mine.recordService.applyBatches([{entityName: 'Individual', resources: [fromAnotherPhone('Individual', 'Individual', patient('p-1'))]}], log, 'phone-b');
        await parkedRecords().afterSync(Date.now(), log);

        expect(hub._appendLedgerRows).toHaveBeenCalledTimes(1);
        const [batches, origin] = hub._appendLedgerRows.mock.calls[0];
        expect([batches.map(({entityName, resources}) => [entityName, resources.map((r) => r.uuid)]), origin]).toEqual([[["Encounter", ["v-1"]]], "phone-a"]);
    });

    it("include an approval of a patient not yet on the phone", async () => {
        await receive('EntityApprovalStatus', {uuid: "eas-1", entityUUID: "p-1", entityType: "Subject", entityTypeUuid: "st-person",
            approvalStatus: {uuid: "approved"}, statusDateTime: at, autoApproved: false, voided: false});
        expect(parked()).toEqual(["eas-1"]);

        await receive('Individual', patient('p-1'));
        await parkedRecords().afterSync(Date.now(), log);

        expect(parked()).toEqual([]);
        expect(mine.rawDb.executeSync("SELECT entity_uuid AS parent FROM entity_approval_status WHERE uuid = 'eas-1'").rows[0].parent).toBe("p-1");
    });

    it("are dropped, not reported, when their patient turns out to be one this user may not view", async () => {
        await receive('Encounter', visit("v-1", "p-1"));

        await parkedRecords().markNotViewable(["p-1"]);
        await parkedRecords().afterSync(Date.now() + 1, log);

        expect(parked()).toEqual([]);
        expect(reports).not.toHaveBeenCalled();
    });

    it("include one this phone cannot build yet, which waits rather than being lost, and is reported if it never builds", async () => {
        await receive('Individual', patient('p-1'));
        const build = jest.spyOn(Encounter, 'fromResource').mockImplementation(() => { throw new Error("form not on this phone"); });
        await receive('Encounter', visit("v-1", "p-1"));
        expect([visitParent("v-1"), parked()]).toEqual([[], ["v-1"]]);

        await parkedRecords().afterSync(Date.now() + 1, log);
        expect(reports.mock.calls.map(([error]) => error.message)).toEqual(["ClinicSharingOrphan: Encounter v-1 still could not be applied on this phone"]);

        build.mockRestore();
        await parkedRecords().afterSync(Date.now() + 2, log);
        expect([visitParent("v-1"), parked()]).toEqual([["p-1"], []]);
    });

    it("chain: a visit in an enrolment waits with it, and both appear when the patient does", async () => {
        await mine.recordService.applyBatches([
            {entityName: 'ProgramEnrolment', resources: [fromAnotherPhone('ProgramEnrolment', 'ProgramEnrolment', {uuid: "enl-1", program: {uuid: "pr-mother"}, individual: {uuid: "p-1"},
                enrolmentDateTime: at, observations: [], programExitObservations: [], voided: false})]},
        ], log);
        await mine.recordService.applyBatches([
            {entityName: 'ProgramEncounter', resources: [fromAnotherPhone('ProgramEncounter', 'ProgramEncounter', {uuid: "pe-1", encounterType: {uuid: "et-anc"},
                programEnrolment: {uuid: "enl-1"}, encounterDateTime: at, observations: [], cancelObservations: [], voided: false})]},
        ], log);
        expect(parked()).toEqual(["enl-1", "pe-1"]);

        await receive('Individual', patient('p-1'));
        await parkedRecords().afterSync(Date.now(), log);

        expect(parked()).toEqual([]);
        expect(mine.rawDb.executeSync("SELECT program_enrolment_uuid AS parent FROM program_encounter WHERE uuid = 'pe-1'").rows[0].parent).toBe("enl-1");
    });
});
