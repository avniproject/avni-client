// "No visit of this kind" becomes a correlated NOT EXISTS; without statistics SQLite searches the child by `voided`, which every row matches.
import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

const SUBJECTS = 300;
const NO_ANC_QUERY = "SUBQUERY(encounters, $e, $e.encounterType.name == 'ANC' AND $e.voided == false).@count == 0";

describe("database statistics for correlated subqueries", () => {
    let rawDb, proxy, lastEnrolmentSelect;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));

        const at = new Date(2026, 0, 1);
        proxy.write(() => {
            const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
            create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"});
            create("Program", {uuid: "pr", name: "Mother", voided: false, active: true, colour: "#000"});
            create("EncounterType", {uuid: "anc", name: "ANC", voided: false, active: true});
            create("EncounterType", {uuid: "pnc", name: "PNC", voided: false, active: true});
            for (let i = 0; i < SUBJECTS; i++) {
                create("Individual", {uuid: `i-${i}`, firstName: `P${i}`, registrationDate: at, voided: false, subjectType: {uuid: "st"}});
                create("ProgramEnrolment", {uuid: `e-${i}`, individual: {uuid: `i-${i}`}, program: {uuid: "pr"}, enrolmentDateTime: at, voided: false});
                create("ProgramEncounter", {uuid: `pnc-${i}`, programEnrolment: {uuid: `e-${i}`}, encounterType: {uuid: "pnc"}, encounterDateTime: at, voided: false});
                if (i % 2 === 0) {
                    create("ProgramEncounter", {uuid: `anc-${i}`, programEnrolment: {uuid: `e-${i}`}, encounterType: {uuid: "anc"}, encounterDateTime: at, voided: false});
                }
            }
        });

        const execute = rawDb.executeSync.bind(rawDb);
        rawDb.executeSync = (sql, params = []) => {
            if (/^\s*SELECT/i.test(sql) && /FROM program_enrolment\b/.test(sql)) lastEnrolmentSelect = {sql, params};
            return execute(sql, params);
        };
    });

    afterEach(() => rawDb.close());

    const planOf = ({sql, params}) => rawDb.executeSync(`EXPLAIN QUERY PLAN ${sql}`, params).rows.map(r => r.detail).join(" | ");

    it("searches visits by enrolment once the database has been optimized", () => {
        proxy.optimize();
        Array.from(proxy.objects("ProgramEnrolment").filtered(NO_ANC_QUERY));
        expect(planOf(lastEnrolmentSelect)).toContain("SEARCH program_encounter USING INDEX idx_program_encounter_program_enrolment_uuid");
    });

    it("returns the same enrolments before and after optimizing", () => {
        const before = Array.from(proxy.objects("ProgramEnrolment").filtered(NO_ANC_QUERY)).map(e => e.uuid).sort();
        proxy.optimize();
        const after = Array.from(proxy.objects("ProgramEnrolment").filtered(NO_ANC_QUERY)).map(e => e.uuid).sort();
        expect(before).toHaveLength(SUBJECTS / 2);
        expect(after).toEqual(before);
    });
});
