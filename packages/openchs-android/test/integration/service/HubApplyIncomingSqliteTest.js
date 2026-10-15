/**
 * Records shared from the hub are saved by the same routine as records pulled from
 * the server, and a phone keeps none of the records its user has no view access to.
 *
 * Run: npx jest --selectProjects integration --testPathPattern HubApplyIncomingSqliteTest
 */
jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/framework/clinicsharing/ClinicTransport", () => ({}));
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({
    zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()})),
}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false),
    setGenericPassword: jest.fn(async () => {}),
    resetGenericPassword: jest.fn(async () => {}),
}));

import {EntityApprovalStatus, EntityMappingConfig, EntityMetaData, Privilege} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import EntityService from "../../../src/service/EntityService";
import PrivilegeService from "../../../src/service/PrivilegeService";
import SyncService from "../../../src/service/SyncService";
import ClinicRecordService from "../../../src/service/clinicsharing/ClinicRecordService";
import {open} from "@op-engineering/op-sqlite";

describe("Hub sync save path on SQLite", () => {
    let rawDb, proxy, syncService, p2pService;
    const log = () => {};
    const at = "2026-10-01T10:00:00.000Z";

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
        const context = {getRepositoryFactory: () => repositoryFactory, getService: (key) => services.get(key)};
        [EntityService, PrivilegeService, SyncService, ClinicRecordService]
            .forEach((cls) => services.set(cls, new cls(proxy, context)));
        services.set('clinicHoldBackService', {recordReceived: async () => {}});
        syncService = services.get(SyncService);
        p2pService = services.get(ClinicRecordService);
        p2pService.ledgerDb = {};
        seedReferenceData();
    });

    afterEach(() => rawDb && rawDb.close());

    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const rowsOf = (table) => rawDb.executeSync(`SELECT uuid FROM ${table} ORDER BY uuid`).rows.map((r) => r.uuid);

    function seedReferenceData() {
        create("SubjectType", {uuid: "st-patient", name: "Patient", type: "Person", voided: false});
        create("SubjectType", {uuid: "st-household", name: "Household", type: "Household", voided: false});
        create("EncounterType", {uuid: "et-visit", name: "Visit", voided: false});
        create("Gender", {uuid: "female", name: "Female", voided: false});
        create("AddressLevel", {uuid: "village", title: "Village", level: 1, voided: false, type: "Village"});
        create("ApprovalStatus", {uuid: "approved", status: "Approved", voided: false});
        create("Privilege", {uuid: "view-subject", name: Privilege.privilegeName.viewSubject, entityType: Privilege.privilegeEntityType.subject});
        create("Privilege", {uuid: "view-visit", name: Privilege.privilegeName.viewVisit, entityType: Privilege.privilegeEntityType.encounter});
    }

    function joinGroup(groupUuid, {hasAllPrivileges = false} = {}) {
        create("Groups", {uuid: groupUuid, name: groupUuid, hasAllPrivileges});
        create("MyGroups", {uuid: `my-${groupUuid}`, groupUuid, groupName: groupUuid, voided: false});
    }

    function grant(groupUuid, privilegeUuid, subjectTypeUuid, allow, extra = {}) {
        create("GroupPrivileges", {
            uuid: `${groupUuid}-${privilegeUuid}-${subjectTypeUuid}-${extra.encounterTypeUuid || ""}`,
            group: {uuid: groupUuid}, privilege: {uuid: privilegeUuid}, subjectTypeUuid, allow, ...extra,
        });
    }

    const individualResource = (uuid, subjectTypeUUID) => ({
        uuid, firstName: uuid, lastName: "x", subjectTypeUUID, genderUUID: "female", addressLevelUUID: "village",
        registrationDate: at, dateOfBirth: "1990-01-01", voided: false, observations: [],
    });
    const encounterResource = (uuid, individualUUID) => ({
        uuid, individualUUID, encounterTypeUUID: "et-visit", encounterDateTime: at, voided: false, observations: [],
    });

    it("saves server and hub records through one routine", async () => {
        const applyIncoming = jest.spyOn(syncService, "applyIncoming");
        joinGroup("admins", {hasAllPrivileges: true});

        await p2pService.applyBatches([{entityName: "Individual", resources: [individualResource("ind-1", "st-patient")]}], log);

        expect(applyIncoming).toHaveBeenCalledTimes(1);
        expect(applyIncoming.mock.calls[0][0].entityName).toBe("Individual");
        expect(rowsOf("individual")).toEqual(["ind-1"]);
    });

    it("refreshes the subject's latest approval when an approval is applied", async () => {
        create("Individual", {uuid: "ind-1", firstName: "a", subjectType: {uuid: "st-patient"}, registrationDate: new Date(at), voided: false, observations: []});
        const metaData = EntityMetaData.findByName("SubjectEntityApprovalStatus");
        const approval = EntityApprovalStatus.create("ind-1", EntityApprovalStatus.entityType.Subject, {uuid: "approved"}, "st-patient");
        approval.uuid = "eas-1";

        await syncService.applyIncoming(metaData, [{uuid: "eas-1", entityUUID: "ind-1"}], [approval]);

        const row = rawDb.executeSync("SELECT latest_entity_approval_status_uuid AS latest FROM individual WHERE uuid = 'ind-1'").rows[0];
        expect(row.latest).toBe("eas-1");
    });

    it("keeps none of a subject type, or its visits, that the user cannot view", async () => {
        joinGroup("pharmacists");
        grant("pharmacists", "view-subject", "st-patient", true);
        grant("pharmacists", "view-subject", "st-household", false);
        grant("pharmacists", "view-visit", "st-patient", true, {encounterTypeUuid: "et-visit"});

        await p2pService.applyBatches([
            {entityName: "Individual", resources: [individualResource("ind-patient", "st-patient"), individualResource("ind-household", "st-household")]},
            {entityName: "Encounter", resources: [encounterResource("enc-patient", "ind-patient"), encounterResource("enc-household", "ind-household")]},
        ], log);

        expect(rowsOf("individual")).toEqual(["ind-patient"]);
        expect(rowsOf("encounter")).toEqual(["enc-patient"]);
    });

    it("keeps out a subject type the user's groups were never given, as server sync does", async () => {
        joinGroup("pharmacists");
        grant("pharmacists", "view-subject", "st-patient", true);

        await p2pService.applyBatches([
            {entityName: "Individual", resources: [individualResource("ind-patient", "st-patient"), individualResource("ind-household", "st-household")]},
        ], log);

        expect(rowsOf("individual")).toEqual(["ind-patient"]);
    });

    it("keeps a visit type the user cannot view out, even on a subject they can", async () => {
        joinGroup("pharmacists");
        grant("pharmacists", "view-subject", "st-patient", true);
        grant("pharmacists", "view-visit", "st-patient", false, {encounterTypeUuid: "et-visit"});

        await p2pService.applyBatches([
            {entityName: "Individual", resources: [individualResource("ind-patient", "st-patient")]},
            {entityName: "Encounter", resources: [encounterResource("enc-patient", "ind-patient")]},
        ], log);

        expect(rowsOf("individual")).toEqual(["ind-patient"]);
        expect(rowsOf("encounter")).toEqual([]);
    });

    it("keeps every record for a user with all privileges", async () => {
        joinGroup("admins", {hasAllPrivileges: true});

        await p2pService.applyBatches([
            {entityName: "Individual", resources: [individualResource("ind-patient", "st-patient"), individualResource("ind-household", "st-household")]},
            {entityName: "Encounter", resources: [encounterResource("enc-household", "ind-household")]},
        ], log);

        expect(rowsOf("individual")).toEqual(["ind-household", "ind-patient"]);
        expect(rowsOf("encounter")).toEqual(["enc-household"]);
    });
});
