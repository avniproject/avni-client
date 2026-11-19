// Run: npx jest --selectProjects integration --testPathPattern EmbeddedListPathQueryTest
import {assert} from "chai";

jest.mock("../../../../src/framework/bean/Service", () => () => (target) => target);

import {EntityMappingConfig, KeyValue} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

const PHONE = "c-phone";
const NOTES = "c-notes";
const answer = (concept, value) => ({concept: {uuid: concept}, valueJSON: JSON.stringify({answer: value})});

describe("a query on a path into an embedded list, on SQLite", () => {
    let rawDb, proxy;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));

        proxy.write(() => {
            const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
            create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"});
            create("EncounterType", {uuid: "et", name: "Visit", voided: false, active: true});
            create("Concept", {uuid: PHONE, name: "Phone", datatype: "PhoneNumber", voided: false, keyValues: [{key: KeyValue.PrimaryContactKey, value: "yes"}]});
            create("Concept", {uuid: NOTES, name: "Notes", datatype: "Text", voided: false, keyValues: []});
            const person = (uuid, observations, visitObservations) => {
                create("Individual", {uuid, firstName: uuid, registrationDate: new Date(2026, 0, 1), voided: false, subjectType: {uuid: "st"}, observations});
                if (visitObservations) create("Encounter", {uuid: `visit-${uuid}`, encounterDateTime: new Date(2026, 1, 1), voided: false, individual: {uuid}, encounterType: {uuid: "et"}, observations: visitObservations});
            };
            person("asha", [answer(PHONE, "9876543210")], [answer(NOTES, "fever")]);
            person("bina", [answer(NOTES, "9876543210")], []);
            person("chitra", [], null);
        });
    });

    afterEach(() => rawDb && rawDb.close());

    const names = (query) => proxy.objects("Individual").filtered(query).map((s) => s.uuid).sort();

    it("counts a visit's answers inside a SUBQUERY", () => {
        assert.deepEqual(names("SUBQUERY(encounters, $enc, $enc.observations.@count > 0).@count > 0"), ["asha"]);
        assert.deepEqual(names("SUBQUERY(encounters, $enc, $enc.observations.@count == 0).@count > 0"), ["bina"]);
    });

    it("finds a subject by a question's key, which only the linked concept holds", () => {
        const query = `(observations.concept.keyValues.key = "${KeyValue.PrimaryContactKey}" or observations.concept.keyValues.key = "${KeyValue.ContactNumberKey}") and (observations.valueJSON CONTAINS "9876543210")`;
        assert.deepEqual(names(query), ["asha"]);
    });

    it("still finds by a question's uuid in SQL", () => {
        assert.deepEqual(names(`observations.concept.uuid == "${PHONE}"`), ["asha"]);
    });
});
