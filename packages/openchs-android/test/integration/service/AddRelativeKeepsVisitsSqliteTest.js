import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));

import {EntityMappingConfig, Individual, IndividualRelative} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import IndividualRelationshipService from "../../../src/service/relationship/IndividualRelationshipService";
import IndividualRelationshipTypeService from "../../../src/service/relationship/IndividualRelationshipTypeService";
import EntityService from "../../../src/service/EntityService";
import {open} from "@op-engineering/op-sqlite";

describe("Adding a household member with a relationship on SQLite", () => {
    let rawDb, proxy, service;
    const at = new Date("2026-11-23T10:00:00.000Z");
    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const read = (schema, uuid) => proxy.objects(schema).filtered("uuid = $0", uuid)[0];

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));
        const repositoryFactory = new RepositoryFactory(proxy);
        const services = new Map([
            [EntityService, {findByUUID: (uuid, schema) => read(schema, uuid)}],
            [IndividualRelationshipTypeService, {getRelationshipType: () => read("IndividualRelationshipType", "father-daughter")}],
        ]);
        service = new IndividualRelationshipService(proxy, {getRepositoryFactory: () => repositoryFactory, getService: (key) => services.get(key)});

        create("SubjectType", {uuid: "st", name: "Person", type: "Person", voided: false});
        create("EncounterType", {uuid: "et", name: "SHG Enrollment", voided: false});
        create("AddressLevel", {uuid: "village", title: "Village", level: 1, type: "Village", voided: false});
        create("IndividualRelation", {uuid: "father", name: "Father", voided: false});
        create("IndividualRelation", {uuid: "daughter", name: "Daughter", voided: false});
        create("IndividualRelationshipType", {uuid: "father-daughter", name: "Father-Daughter", individualAIsToBRelation: {uuid: "father"}, individualBIsToARelation: {uuid: "daughter"}, voided: false});
        ["head", "member"].forEach((uuid) => create("Individual", {uuid, firstName: uuid, subjectType: {uuid: "st"}, lowestAddressLevel: {uuid: "village"}, registrationDate: at, voided: false, observations: []}));
        [0, 1, 2, 3].forEach((n) => create("Encounter", {uuid: `visit-${n}`, encounterType: {uuid: "et"}, individual: {uuid: "member"}, earliestVisitDateTime: at, maxVisitDateTime: at, voided: false, observations: [], cancelObservations: []}));
    });
    afterEach(() => rawDb && rawDb.close());

    // The Add Member form hands over its own copy of the new member, with no visits on it.
    const formCopyOfMember = () => {
        const member = Individual.createEmptyInstance();
        member.uuid = "member";
        member.firstName = "member";
        return member;
    };

    it("keeps the member's scheduled visits, saves the relationship and links it to both people", () => {
        proxy.write(() => service.addOrUpdateRelative(new IndividualRelative(read("Individual", "head"), formCopyOfMember(), read("IndividualRelation", "daughter"))));

        const counts = {
            memberVisits: read("Individual", "member").encounters.length,
            relationships: proxy.objects("IndividualRelationship").filtered("voided = false").map((r) => `${r.individualA.uuid}->${r.individualB.uuid}`),
            headLinks: read("Individual", "head").relationships.length,
            memberRelatives: service.getRelatives(read("Individual", "member")).map((r) => r.relative.uuid),
            queued: proxy.objects("EntityQueue").filtered("entity = 'IndividualRelationship'").length,
        };
        assert.deepEqual(counts, {memberVisits: 4, relationships: ["head->member"], headLinks: 1, memberRelatives: ["head"], queued: 1});
    });
});
