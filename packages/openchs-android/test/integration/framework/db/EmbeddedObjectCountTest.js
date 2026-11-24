import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

const obs = (conceptUuid, value) => ({concept: {uuid: conceptUuid}, valueJSON: JSON.stringify({answer: value})});

describe("counting observations and points stored inside their parent rows", () => {
    let rawDb, proxy, selects;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));

        selects = [];
        const execute = rawDb.executeSync.bind(rawDb);
        rawDb.executeSync = (sql, params = []) => {
            if (/^\s*SELECT/i.test(sql)) selects.push(sql);
            return execute(sql, params);
        };
    });

    afterEach(() => rawDb.close());

    it("reads zero on an empty database", () => {
        expect(proxy.execCountObservationsAndPoints()).toEqual({observations: 0, points: 0});
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
                subjectLocation: {coordinates: {x: 7, y: 8}, accuracy: 4},
            });
            create("Individual", {
                uuid: "i-2", firstName: "B", registrationDate: at, voided: false, subjectType: {uuid: "st"},
                subjectLocation: {accuracy: 4},
            });
            create("Encounter", {
                uuid: "e-1", individual: {uuid: "i-1"}, encounterType: {uuid: "et"}, encounterDateTime: at, voided: false,
                observations: [obs("c1", 3)], cancelObservations: [obs("c3", 4)],
                encounterLocation: {x: 3, y: 4}, cancelLocation: {x: 5, y: 6},
            });
        });

        expect(proxy.execCountObservationsAndPoints()).toEqual({observations: 4, points: 4});
    });

    it("reads each table once, so a subject's location costs no extra read", () => {
        proxy.execCountObservationsAndPoints();

        const reads = selects.join("\n").match(/FROM individual\b/g) || [];
        expect(reads).toHaveLength(1);
    });
});
