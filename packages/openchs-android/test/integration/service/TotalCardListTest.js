/**
 * The total card opens the same subject list as the visit cards, showing every non-voided subject
 * in the catchment — the largest list this screen can open. Its rows show enrolment badges, so the
 * enrolments list stays eager and nothing else does.
 *
 * Tracking issue: avniproject/avni-client#2105.
 *   npx jest --selectProjects integration --testPathPattern TotalCardListTest
 */
import {assert} from "chai";

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
const ANC = "et-anc";

describe("total card list", () => {
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

            // Enrolled, with a visit history the total card never shows.
            create("Individual", {uuid: "kavita", firstName: "Kavita", registrationDate: TODAY, voided: false, subjectType: {uuid: "st"}});
            create("ProgramEnrolment", {uuid: "kavita-enl", individual: {uuid: "kavita"}, program: {uuid: "pr"}, enrolmentDateTime: TODAY, voided: false});
            create("ProgramEncounter", {uuid: "kavita-anc-1", programEnrolment: {uuid: "kavita-enl"}, encounterType: {uuid: ANC}, encounterDateTime: TODAY, voided: false});
            create("ProgramEncounter", {uuid: "kavita-anc-2", programEnrolment: {uuid: "kavita-enl"}, encounterType: {uuid: ANC}, encounterDateTime: TODAY, voided: false});

            // Never enrolled. The badge strip must render empty, not throw.
            create("Individual", {uuid: "radha", firstName: "Radha", registrationDate: TODAY, voided: false, subjectType: {uuid: "st"}});

            // Voided — off the card entirely.
            create("Individual", {uuid: "gone", firstName: "Gone", registrationDate: TODAY, voided: true, subjectType: {uuid: "st"}});
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
    const subjectFor = (rows, uuid) => [...rows].find(subject => subject.uuid === uuid);

    it("lists every non-voided subject, sorted by name", () => {
        const rows = [...service.allIn(TODAY, [], "")];

        assert.deepEqual(rows.map(subject => subject.uuid), ["kavita", "radha"]);
    });

    it("prefetches the enrolment badges the row shows", () => {
        const kavita = subjectFor(service.allIn(TODAY, [], ""), "kavita");

        assert.isTrue(isPrefetched(kavita, "enrolments"));
        assert.deepEqual(kavita.nonVoidedEnrolments().map(enl => enl.program.name), ["Mother"]);
    });

    it("leaves the visit history behind the row unloaded", () => {
        const kavita = subjectFor(service.allIn(TODAY, [], ""), "kavita");

        assert.isFalse(isPrefetched(kavita, "encounters"));
        assert.isFalse(isPrefetched(kavita.that.enrolments[0], "encounters"));
    });

    it("renders an empty badge strip for a subject with no enrolments", () => {
        const radha = subjectFor(service.allIn(TODAY, [], ""), "radha");

        assert.isTrue(isPrefetched(radha, "enrolments"));
        assert.deepEqual(radha.nonVoidedEnrolments(), []);
    });

    // A configured search-result concept reads observations off the row. They are JSON on the
    // subject's own row, parsed with it, so they are present without a query at any depth.
    it("keeps observations on the row for a configured search-result concept", () => {
        const kavita = subjectFor(service.allIn(TODAY, [], ""), "kavita");

        assert.isTrue(isPrefetched(kavita, "observations"));
        assert.deepEqual([...kavita.observations], []);
    });

    it("still narrows by a configured query addition", () => {
        const rows = [...service.allIn(TODAY, [], 'firstName = "Radha"')];

        assert.deepEqual(rows.map(subject => subject.uuid), ["radha"]);
    });
});
