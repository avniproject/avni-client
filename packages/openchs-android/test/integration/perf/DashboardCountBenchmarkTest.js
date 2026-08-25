/**
 * #2024 restored subject-counting on the dashboard cards; #1865's win — counting without
 * hydrating rows — has to survive it. At 10k scale the count path must stay far below the
 * drill-down that hydrates the same rows.
 *
 * Run: npx jest --selectProjects integration --testPathPattern DashboardCountBenchmark
 */
import {assert} from "chai";
import moment from "moment";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import IndividualService from "../../../src/service/IndividualService";
import CustomFilterService from "../../../src/service/CustomFilterService";
import PrivilegeService from "../../../src/service/PrivilegeService";
import {open} from "@op-engineering/op-sqlite";

const TODAY = new Date(2026, 0, 15);
const SUBJECTS = 5000;
const VISITS_PER_SUBJECT = 2;

describe("dashboard count performance at scale", () => {
    let rawDb, service;

    beforeAll(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        const earliest = moment(TODAY).subtract(2, "day").toDate();
        const max = moment(TODAY).add(5, "day").toDate();
        proxy.write(() => {
            proxy.create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"}, true, {skipHydration: true});
            proxy.create("Program", {uuid: "pr", name: "Child", voided: false, active: true, colour: "#000"}, true, {skipHydration: true});
            proxy.create("EncounterType", {uuid: "et", name: "Monthly", voided: false, active: true}, true, {skipHydration: true});
            for (let i = 0; i < SUBJECTS; i++) {
                proxy.create("Individual", {uuid: `ind-${i}`, firstName: `P${i}`, registrationDate: TODAY, voided: false, subjectType: {uuid: "st"}}, true, {skipHydration: true});
                proxy.create("ProgramEnrolment", {uuid: `enr-${i}`, individual: {uuid: `ind-${i}`}, program: {uuid: "pr"}, enrolmentDateTime: TODAY, voided: false}, true, {skipHydration: true});
                for (let j = 0; j < VISITS_PER_SUBJECT; j++) {
                    proxy.create("ProgramEncounter", {uuid: `pe-${i}-${j}`, programEnrolment: {uuid: `enr-${i}`}, encounterType: {uuid: "et"}, name: "V", earliestVisitDateTime: earliest, maxVisitDateTime: max, encounterDateTime: null, cancelDateTime: null, voided: false}, true, {skipHydration: true});
                    proxy.create("Encounter", {uuid: `enc-${i}-${j}`, individual: {uuid: `ind-${i}`}, encounterType: {uuid: "et"}, name: "V", earliestVisitDateTime: earliest, maxVisitDateTime: max, encounterDateTime: null, cancelDateTime: null, voided: false}, true, {skipHydration: true});
                }
            }
        });
        proxy.buildReferenceCache([
            {schemaName: "SubjectType", depth: 1, skipLists: true},
            {schemaName: "Program", depth: 1, skipLists: true},
            {schemaName: "EncounterType", depth: 1, skipLists: true}
        ]);

        const repositoryFactory = new RepositoryFactory(proxy);
        const stubs = new Map([
            [CustomFilterService, {}],
            [PrivilegeService, {hasAllPrivileges: () => true, allowedEntityTypeUUIDListForCriteria: () => []}]
        ]);
        service = new IndividualService(proxy, {
            getRepositoryFactory: () => repositoryFactory,
            getService: (klass) => stubs.get(klass)
        });
    }, 120000);

    afterAll(() => rawDb && rawDb.close());

    it("counts 20k scheduled rows as 5k subjects without hydrating them", () => {
        const countStart = Date.now();
        const count = service.countScheduledVisits(TODAY, [], "", "");
        const countMs = Date.now() - countStart;

        const listStart = Date.now();
        const listLength = service.allScheduledVisitsIn(TODAY, [], "", "").length;
        const listMs = Date.now() - listStart;

        console.log(`countScheduledVisits: ${countMs}ms  allScheduledVisitsIn: ${listMs}ms  (${count} subjects over ${SUBJECTS * VISITS_PER_SUBJECT * 2} rows)`);
        assert.equal(count, SUBJECTS);
        assert.equal(listLength, SUBJECTS);
        assert.isBelow(countMs, 1000, "count path must not fall back to hydrating rows");
        assert.isBelow(countMs, listMs, "count path must stay cheaper than the drill-down it summarises");
    }, 120000);
});
