/**
 * The recent-enrolments card opens the same subject list as the visit cards. Its rows show the
 * subject and its enrolment badges, never the visit history behind them.
 *
 * Tracking issue: avniproject/avni-client#2105.
 *   npx jest --selectProjects integration --testPathPattern RecentEnrolmentsListTest
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
const LONG_AGO = moment(TODAY).subtract(400, "day").toDate();
const ANC = "et-anc";

describe("recent enrolments list", () => {
    let rawDb, service;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        proxy.write(() => {
            const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
            create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"});
            create("Program", {uuid: "pr", name: "Mother", voided: false, active: true, colour: "#000"});
            create("EncounterType", {uuid: ANC, name: "ANC", voided: false, active: true});

            // Enrolled today, with a visit history the card never shows.
            create("Individual", {uuid: "kavita", firstName: "Kavita", registrationDate: TODAY, voided: false, subjectType: {uuid: "st"}});
            create("ProgramEnrolment", {uuid: "kavita-enl", individual: {uuid: "kavita"}, program: {uuid: "pr"}, enrolmentDateTime: TODAY, voided: false});
            create("ProgramEncounter", {uuid: "kavita-anc-1", programEnrolment: {uuid: "kavita-enl"}, encounterType: {uuid: ANC}, encounterDateTime: TODAY, voided: false});
            create("ProgramEncounter", {uuid: "kavita-anc-2", programEnrolment: {uuid: "kavita-enl"}, encounterType: {uuid: ANC}, encounterDateTime: TODAY, voided: false});

            // Enrolled 400 days ago — off the card.
            create("Individual", {uuid: "radha", firstName: "Radha", registrationDate: LONG_AGO, voided: false, subjectType: {uuid: "st"}});
            create("ProgramEnrolment", {uuid: "radha-enl", individual: {uuid: "radha"}, program: {uuid: "pr"}, enrolmentDateTime: LONG_AGO, voided: false});
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
    });

    afterEach(() => rawDb && rawDb.close());

    // A prefetched list is a plain data property; a deferred one is an accessor.
    const isPrefetched = (entity, propName) => !Object.getOwnPropertyDescriptor(entity.that || entity, propName).get;
    const rowFor = (rows, subjectUuid) => rows.find(row => row.individual.uuid === subjectUuid);

    it("lists the subjects enrolled in the window", () => {
        const rows = service.recentlyEnrolled(TODAY, [], "");

        assert.sameMembers(rows.map(row => row.individual.uuid), ["kavita"]);
    });

    it("prefetches the enrolment badges the row shows", () => {
        const individual = rowFor(service.recentlyEnrolled(TODAY, [], ""), "kavita").individual;

        assert.isTrue(isPrefetched(individual, "enrolments"));
        assert.deepEqual(individual.nonVoidedEnrolments().map(enl => enl.program.name), ["Mother"]);
    });

    it("leaves the visit history behind the row unloaded", () => {
        const individual = rowFor(service.recentlyEnrolled(TODAY, [], ""), "kavita").individual;

        assert.isFalse(isPrefetched(individual, "encounters"));
        assert.isFalse(isPrefetched(individual.that.enrolments[0], "encounters"));
    });

    it("keeps the row shape the list view reads", () => {
        const row = rowFor(service.recentlyEnrolled(TODAY, [], ""), "kavita");

        assert.deepEqual(row.visitInfo.visitName, []);
        assert.strictEqual(row.visitInfo.uuid, "kavita");
        assert.isTrue(row.visitInfo.allow);
    });
});
