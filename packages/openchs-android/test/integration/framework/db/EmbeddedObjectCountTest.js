import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

const obs = (conceptUuid, value) => ({concept: {uuid: conceptUuid}, valueJSON: JSON.stringify({answer: value})});

describe("counting observations and points stored inside their parent rows", () => {
    let rawDb, proxy;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));
    });

    afterEach(() => rawDb.close());

    it("reads zero on an empty database", () => {
        expect(proxy.execCountEmbedded("Observation")).toBe(0);
        expect(proxy.execCountEmbedded("Point")).toBe(0);
    });

    it("counts every observation and point across subjects, visits and cancellations", () => {
        const at = new Date(2026, 0, 1);
        proxy.write(() => {
            const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
            create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"});
            create("EncounterType", {uuid: "et", name: "Visit", voided: false, active: true});
            create("Individual", {
                uuid: "i-1", firstName: "A", registrationDate: at, voided: false, subjectType: {uuid: "st"},
                observations: [obs("c1", 1), obs("c2", 2)], registrationLocation: {x: 1.5, y: 2.5},
            });
            create("Individual", {uuid: "i-2", firstName: "B", registrationDate: at, voided: false, subjectType: {uuid: "st"}});
            create("Encounter", {
                uuid: "e-1", individual: {uuid: "i-1"}, encounterType: {uuid: "et"}, encounterDateTime: at, voided: false,
                observations: [obs("c1", 3)], cancelObservations: [obs("c3", 4)],
                encounterLocation: {x: 3, y: 4}, cancelLocation: {x: 5, y: 6},
            });
        });

        expect(proxy.execCountEmbedded("Observation")).toBe(4);
        expect(proxy.execCountEmbedded("Point")).toBe(3);
    });
});
