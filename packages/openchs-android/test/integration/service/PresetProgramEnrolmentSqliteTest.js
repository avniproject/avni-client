/**
 * A Subject Type filter's preset program counts only while the preset subject type has a live enrolment form mapping for
 * it (DashboardFilterService.presetProgramOf, avni-client#2222), checked with one counted query,
 * FormMappingService.isEnrolmentMapped. Its unit test pins the criteria string with the query stubbed. This runs the
 * query on the newer phone database, where the criteria go through the query translator, against mappings that must
 * count (one, or two for one program) and mappings that must not (voided, for another subject type, of another form type).
 * The older database cannot run under jest, which mocks Realm.
 *
 * Run: npx jest --selectProjects integration --testPathPattern PresetProgramEnrolmentSqliteTest
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import FormMappingService from "../../../src/service/FormMappingService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import {open} from "@op-engineering/op-sqlite";

// Each program's enrolment form mappings, all for the Household subject type unless named.
const PROGRAMS = {
    "p-once": "one live enrolment mapping",
    "p-twice": "two live enrolment mappings",
    "p-voided-mapping": "a voided enrolment mapping only",
    "p-person-only": "a live enrolment mapping for the Person subject type only",
    "p-exit-only": "a live exit mapping only",
    "p-visit-only": "a live programme visit mapping only",
    "p-unmapped": "no mapping",
    "p-deleted": "one live enrolment mapping, the program itself deleted",
};

describe("a preset program's enrolment check on the newer phone database", () => {
    let rawDb, proxy, formMappingService, dashboardFilterService, statements;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        proxy.write(() => {
            const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
            create("SubjectType", {uuid: "st-household", name: "Household", type: "Household", voided: false, active: true});
            create("SubjectType", {uuid: "st-person", name: "Person", type: "Person", voided: false, active: true});
            Object.keys(PROGRAMS).forEach(uuid => create("Program", {uuid, name: uuid, voided: uuid === "p-deleted", active: true, colour: "#000"}));
            create("Form", {uuid: "f-enrol", formType: "ProgramEnrolment", name: "Enrolment"});
            create("Form", {uuid: "f-enrol-2", formType: "ProgramEnrolment", name: "Enrolment again"});
            create("Form", {uuid: "f-exit", formType: "ProgramExit", name: "Exit"});
            create("Form", {uuid: "f-visit", formType: "ProgramEncounter", name: "Visit"});
            create("EncounterType", {uuid: "et-visit", name: "Visit", voided: false, active: true});
            const mapping = (uuid, form, program, fields = {}) => create("FormMapping", {
                uuid, form: {uuid: form}, subjectType: {uuid: "st-household"}, entityUUID: program, voided: false, enableApproval: false, ...fields,
            });
            mapping("m-once", "f-enrol", "p-once");
            mapping("m-twice-1", "f-enrol", "p-twice");
            mapping("m-twice-2", "f-enrol-2", "p-twice");
            mapping("m-voided", "f-enrol", "p-voided-mapping", {voided: true});
            mapping("m-person", "f-enrol", "p-person-only", {subjectType: {uuid: "st-person"}});
            mapping("m-exit", "f-exit", "p-exit-only");
            mapping("m-visit", "f-visit", "p-visit-only", {observationsTypeEntityUUID: "et-visit"});
            mapping("m-deleted", "f-enrol", "p-deleted");
        });
        // As after a sync: subject types and programs are read from the reference cache.
        proxy.buildReferenceCache(SqliteProxy.DEFAULT_REFERENCE_CACHE_CONFIGS);

        const repositoryFactory = new RepositoryFactory(proxy);
        const services = new Map();
        const context = {getRepositoryFactory: () => repositoryFactory, getService: (klass) => services.get(klass)};
        formMappingService = new FormMappingService(proxy, context);
        dashboardFilterService = new DashboardFilterService(proxy, context);
        services.set(FormMappingService, formMappingService);
        services.set(DashboardFilterService, dashboardFilterService);

        // Records every statement sent, with its bound values, while `statements` is an array.
        statements = null;
        const executeSync = rawDb.executeSync.bind(rawDb);
        rawDb.executeSync = (sql, params) => {
            if (statements) statements.push({sql, params: params || []});
            return executeSync(sql, params);
        };
    });

    afterEach(() => rawDb && rawDb.close());

    const subjectType = (uuid) => formMappingService.findByUUID(uuid, "SubjectType");
    const program = (uuid) => formMappingService.findByUUID(uuid, "Program");
    const presetOf = (presetProgramUUID) => dashboardFilterService.getDashboardFilterConfig({
        uuid: "f", name: "Type",
        filterConfig: JSON.stringify({type: "SubjectType", widget: "Default", presetSubjectTypeUUID: "st-household", presetProgramUUID}),
    });

    it.each([
        ["p-once", "p-once"],
        ["p-twice", "p-twice"],
        ["p-voided-mapping", null],
        ["p-person-only", null],
        ["p-exit-only", null],
        ["p-visit-only", null],
        ["p-unmapped", null],
        ["p-deleted", null],
    ])("with %s as the preset program, gives the preset program %p and keeps the subject type", (presetProgramUUID, expected) => {
        const config = presetOf(presetProgramUUID);
        assert.equal(config.presetSubjectType.uuid, "st-household", PROGRAMS[presetProgramUUID]);
        assert.equal(config.presetProgram ? config.presetProgram.uuid : null, expected, PROGRAMS[presetProgramUUID]);
    });

    it("answers as the filter's program step lists each subject type's programs, for every live program", () => {
        ["st-household", "st-person"].forEach(subjectTypeUUID => {
            const listed = formMappingService.findProgramsForSubjectTypes([subjectType(subjectTypeUUID)]).map(p => p.uuid);
            Object.keys(PROGRAMS).filter(uuid => uuid !== "p-deleted").forEach(programUUID => {
                assert.equal(formMappingService.isEnrolmentMapped(program(programUUID), subjectType(subjectTypeUUID)), listed.includes(programUUID),
                    `${programUUID} (${PROGRAMS[programUUID]}) for ${subjectTypeUUID}`);
            });
        });
        // The comparison is not empty on either side.
        assert.sameMembers(formMappingService.findProgramsForSubjectTypes([subjectType("st-household")]).map(p => p.uuid), ["p-once", "p-twice"]);
        assert.sameMembers(formMappingService.findProgramsForSubjectTypes([subjectType("st-person")]).map(p => p.uuid), ["p-person-only"]);
    });

    // The preset is read on every render, so the check must not read every form mapping. A condition the translator cannot
    // read is applied in JS after a wider read, and then its value is not among the statement's bound values.
    it("is one query on the form mappings, with the program, the form type and the subject type in its SQL", () => {
        const household = subjectType("st-household");
        const twice = program("p-twice");
        statements = [];
        const mapped = formMappingService.isEnrolmentMapped(twice, household);
        const sent = statements;
        statements = null;
        assert.isTrue(mapped);
        assert.equal(sent.length, 1, sent.map(s => s.sql).join("\n"));
        assert.match(sent[0].sql, /\bform_mapping\b/);
        assert.includeMembers(sent[0].params, ["p-twice", "ProgramEnrolment", "st-household"]);
    });
});
