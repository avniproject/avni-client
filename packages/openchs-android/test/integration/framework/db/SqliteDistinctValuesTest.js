/**
 * distinctValues/countDistinct return one value per distinct column value without
 * hydrating rows, so a dashboard count can be a count of people rather than of rows.
 *
 * Run: npx jest --selectProjects integration --testPathPattern SqliteDistinctValues
 */
import {assert} from "chai";
import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

describe("SqliteResultsProxy distinct projections", () => {
    let rawDb, proxy;

    beforeAll(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        proxy.write(() => {
            proxy.create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"}, true, {skipHydration: true});
            proxy.create("Program", {uuid: "pr", name: "Child", voided: false, active: true, colour: "#000"}, true, {skipHydration: true});
            proxy.create("EncounterType", {uuid: "et", name: "Monthly", voided: false, active: true}, true, {skipHydration: true});
            // ind-1 carries three encounters, ind-2 one.
            ["ind-1", "ind-2"].forEach((u) => {
                proxy.create("Individual", {uuid: u, firstName: u, voided: false, subjectType: {uuid: "st"}}, true, {skipHydration: true});
                proxy.create("ProgramEnrolment", {uuid: `enr-${u}`, individual: {uuid: u}, program: {uuid: "pr"}, enrolmentDateTime: new Date(2026, 0, 1), voided: false}, true, {skipHydration: true});
            });
            for (let i = 0; i < 3; i++) {
                proxy.create("ProgramEncounter", {uuid: `pe-1-${i}`, programEnrolment: {uuid: "enr-ind-1"}, encounterType: {uuid: "et"}, encounterDateTime: new Date(2026, 0, 2), voided: false}, true, {skipHydration: true});
            }
            proxy.create("ProgramEncounter", {uuid: "pe-2-0", programEnrolment: {uuid: "enr-ind-2"}, encounterType: {uuid: "et"}, encounterDateTime: new Date(2026, 0, 2), voided: false}, true, {skipHydration: true});
        });
        proxy.buildReferenceCache([
            {schemaName: "SubjectType", depth: 1, skipLists: true},
            {schemaName: "Program", depth: 1, skipLists: true},
            {schemaName: "EncounterType", depth: 1, skipLists: true}
        ]);
    });

    afterAll(() => rawDb && rawDb.close());

    const encounters = () => proxy.objects("ProgramEncounter").filtered("voided = false");

    it("resolves a dot path through joins and returns each subject once", () => {
        const uuids = encounters().distinctValues("programEnrolment.individual.uuid");
        assert.deepEqual(uuids.slice().sort(), ["ind-1", "ind-2"]);
    });

    it("counts distinct values of a dot path", () => {
        assert.equal(encounters().countDistinct("programEnrolment.individual.uuid"), 2);
        assert.equal(encounters().count(), 4);
    });

    it("honours filters added after the projection column is chosen", () => {
        const uuids = proxy.objects("ProgramEncounter")
            .filtered('uuid = "pe-1-0" OR uuid = "pe-1-1"')
            .distinctValues("programEnrolment.individual.uuid");
        assert.deepEqual(uuids, ["ind-1"]);
    });

    it("projects a plain column on the base table", () => {
        assert.deepEqual(proxy.objects("Individual").distinctValues("uuid").slice().sort(), ["ind-1", "ind-2"]);
    });

    it("falls back to hydrated rows when a clause could not be translated to SQL", () => {
        const query = proxy.objects("ProgramEncounter").filtered("voided = false");
        query.jsFallbackFilters.push({query: 'uuid = "pe-2-0" AND voided = false', args: [], reason: "test"});
        assert.deepEqual(query.distinctValues("programEnrolment.individual.uuid"), ["ind-2"]);
    });
});
