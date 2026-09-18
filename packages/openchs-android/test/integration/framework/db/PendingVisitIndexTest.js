/**
 * The scheduled and overdue cards filter pending visits by date. The only index their query could
 * start from was `voided`, which nearly every row matches, so the query walked every visit in the
 * organisation before looking at the dates — each row got dearer as the organisation grew, at the
 * same number of rows. A composite index starting with `voided` is picked over it without needing
 * table statistics, which the app never gathers.
 *
 * Run: npx jest --selectProjects integration --testPathPattern PendingVisitIndexTest
 */
import {assert} from "chai";
import moment from "moment";

import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import {open} from "@op-engineering/op-sqlite";

const INDEX = "idx_program_encounter_pending_visits";
const TODAY = new Date(2026, 0, 15);
const SUBJECTS = 300;
const PENDING = 20;

describe("pending visit index (#2105)", () => {
    let rawDb, proxy;

    beforeAll(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));

        const longAgo = moment(TODAY).subtract(400, "day").toDate();
        proxy.write(() => {
            const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
            create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"});
            create("Program", {uuid: "pr", name: "Mother", voided: false, active: true, colour: "#000"});
            create("EncounterType", {uuid: "et", name: "ANC", voided: false, active: true});
            for (let i = 0; i < SUBJECTS; i++) {
                create("Individual", {uuid: `i-${i}`, firstName: `P${i}`, registrationDate: longAgo, voided: false, subjectType: {uuid: "st"}});
                create("ProgramEnrolment", {uuid: `e-${i}`, individual: {uuid: `i-${i}`}, program: {uuid: "pr"}, enrolmentDateTime: longAgo, voided: false});
                // Visit history: completed, so never on either card.
                create("ProgramEncounter", {uuid: `done-${i}`, programEnrolment: {uuid: `e-${i}`}, encounterType: {uuid: "et"}, earliestVisitDateTime: longAgo, maxVisitDateTime: longAgo, encounterDateTime: longAgo, voided: false});
                if (i < PENDING) {
                    create("ProgramEncounter", {uuid: `due-${i}`, programEnrolment: {uuid: `e-${i}`}, encounterType: {uuid: "et"}, earliestVisitDateTime: moment(TODAY).subtract(1, "day").toDate(), maxVisitDateTime: moment(TODAY).add(3, "day").toDate(), encounterDateTime: null, voided: false});
                    create("ProgramEncounter", {uuid: `late-${i}`, programEnrolment: {uuid: `e-${i}`}, encounterType: {uuid: "et"}, earliestVisitDateTime: longAgo, maxVisitDateTime: moment(TODAY).subtract(10, "day").toDate(), encounterDateTime: null, voided: false});
                }
            }
        });
    });

    afterAll(() => rawDb && rawDb.close());

    const PENDING_AND = "encounterDateTime = null AND cancelDateTime = null AND voided = false";
    const scheduled = () => proxy.objects("ProgramEncounter")
        .filtered(`earliestVisitDateTime <= $0 AND maxVisitDateTime >= $1 AND ${PENDING_AND}`,
            moment(TODAY).endOf("day").toDate(), moment(TODAY).startOf("day").toDate());
    const overdue = () => proxy.objects("ProgramEncounter")
        .filtered(`maxVisitDateTime < $0 AND ${PENDING_AND}`, moment(TODAY).startOf("day").toDate());

    const planFor = (query) => {
        const {sql, params} = query._buildSql();
        const result = rawDb.executeSync(`EXPLAIN QUERY PLAN ${sql}`, params);
        return (result.rows?._array || result.rows || []).map(r => r.detail).join(" | ");
    };

    it("creates the index", () => {
        const names = rawDb.executeSync("select name from sqlite_master where type='index' and tbl_name='program_encounter'");
        assert.include((names.rows?._array || names.rows || []).map(r => r.name), INDEX);
    });

    it("uses it for the scheduled card, rather than scanning every visit in the organisation", () => {
        assert.include(planFor(scheduled()), INDEX);
    });

    it("uses it for the overdue card", () => {
        assert.include(planFor(overdue()), INDEX);
    });

    it("returns the same rows it did without the index", () => {
        rawDb.executeSync(`DROP INDEX ${INDEX}`);
        const scheduledBefore = scheduled().map(e => e.uuid).sort();
        const overdueBefore = overdue().map(e => e.uuid).sort();
        rawDb.executeSync(`CREATE INDEX ${INDEX} ON program_encounter("voided", "encounter_date_time", "cancel_date_time", "max_visit_date_time")`);

        assert.deepEqual(scheduled().map(e => e.uuid).sort(), scheduledBefore);
        assert.deepEqual(overdue().map(e => e.uuid).sort(), overdueBefore);
        assert.equal(scheduledBefore.length, PENDING);
        assert.equal(overdueBefore.length, PENDING);
    });
});
