// Searches run through getSubjects as the app does: the SQL query, then the in-memory answer check.
// Run: npx jest --selectProjects integration --testPathPattern CustomFilterCodedQueryTest
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {EntityMappingConfig, Concept, CustomFilter} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import CustomFilterService from "../../../src/service/CustomFilterService";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import ConceptService from "../../../src/service/ConceptService";
import {open} from "@op-engineering/op-sqlite";

const EDUCATION = "c-education";
const PRIMARY = "a-primary";
const SECONDARY = "a-secondary";
const OCCUPATION = "c-occupation";
const NOTES = "c-notes";
const VISIT = "et-visit";
const PROGRAM = "pr-child";
const PROGRAM_VISIT = "et-program-visit";
const SCOPE_PARAMETERS = {encounterTypeUUIDs: [VISIT, PROGRAM_VISIT], programUUIDs: [PROGRAM]};
const answer = (concept, answerUuid) => ({concept: {uuid: concept}, valueJSON: JSON.stringify({answer: answerUuid})});

const concepts = {
    [EDUCATION]: {uuid: EDUCATION, datatype: Concept.dataType.Coded, isCodedConcept: () => true},
    [NOTES]: {uuid: NOTES, datatype: Concept.dataType.Text, isCodedConcept: () => false},
};
const conceptService = {findByUUID: uuid => concepts[uuid], getConceptByUUID: uuid => concepts[uuid]};

describe("coded custom filter on SQLite", () => {
    let rawDb, proxy, service;

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
            create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"});
            create("EncounterType", {uuid: VISIT, name: "Visit", voided: false, active: true});
            create("EncounterType", {uuid: PROGRAM_VISIT, name: "Program visit", voided: false, active: true});
            create("Program", {uuid: PROGRAM, name: "Child", voided: false, active: true, colour: "#000"});
            const person = (uuid, observations) => {
                create("Individual", {uuid, firstName: uuid, registrationDate: new Date(2026, 0, 1), voided: false, subjectType: {uuid: "st"}, observations});
                create("Encounter", {uuid: `visit-${uuid}`, encounterDateTime: new Date(2026, 1, 1), voided: false, individual: {uuid}, encounterType: {uuid: VISIT}, observations});
                create("ProgramEnrolment", {uuid: `enrolment-${uuid}`, enrolmentDateTime: new Date(2026, 0, 2), voided: false, individual: {uuid}, program: {uuid: PROGRAM}, observations});
                create("ProgramEncounter", {uuid: `program-visit-${uuid}`, encounterDateTime: new Date(2026, 1, 2), voided: false, programEnrolment: {uuid: `enrolment-${uuid}`}, encounterType: {uuid: PROGRAM_VISIT}, observations});
            };
            person("kumar", [answer(EDUCATION, PRIMARY)]);
            person("sec-1", [answer(OCCUPATION, "a-farmer"), answer(EDUCATION, SECONDARY)]);
            person("sec-2", [answer(EDUCATION, SECONDARY)]);
            // Has the question and the option, but on different questions: not a Secondary match.
            person("mixed", [answer(EDUCATION, PRIMARY), answer(OCCUPATION, SECONDARY)]);
            person("noted", [{concept: {uuid: NOTES}, valueJSON: JSON.stringify({answer: "needs follow up"})}]);
            person("none", []);
        });

        service = new CustomFilterService(proxy, {getRepositoryFactory: () => new RepositoryFactory(proxy), getService: () => conceptService});
    });

    afterEach(() => rawDb && rawDb.close());

    const search = (conceptUUID, selected, scope = CustomFilter.scope.Registration) => {
        const filter = {type: CustomFilter.type.Concept, conceptUUID, widget: CustomFilter.widget.Default};
        const query = service.getFilterQueryByTypeFunction(filter, selected);
        return service.getSubjects(conceptUUID, selected, filter.type, scope, SCOPE_PARAMETERS, filter.widget, query);
    };

    const dashboard = (conceptUUID, filterValue, scope = CustomFilter.scope.Registration) => {
        const filter = {type: CustomFilter.type.Concept, conceptUUID, widget: CustomFilter.widget.Default};
        const query = service.getFilterQueryByTypeFunctionV2(filter, filterValue);
        return service.getSubjects(conceptUUID, filterValue, filter.type, scope, SCOPE_PARAMETERS, filter.widget, query);
    };

    it("search finds the people who chose the option", () => {
        assert.sameMembers(search(EDUCATION, [{uuid: SECONDARY}]), ["sec-1", "sec-2"]);
    });

    it("search finds the people who chose another option, including a person with only that answer", () => {
        assert.sameMembers(search(EDUCATION, [{uuid: PRIMARY}]), ["kumar", "mixed"]);
    });

    it("search finds people who chose any of several options", () => {
        assert.sameMembers(search(EDUCATION, [{uuid: PRIMARY}, {uuid: SECONDARY}]), ["kumar", "sec-1", "sec-2", "mixed"]);
    });

    it("dashboard filters find the same people", () => {
        assert.sameMembers(dashboard(EDUCATION, [{uuid: SECONDARY}]), ["sec-1", "sec-2"]);
    });

    it("a coded filter on a visit finds the people whose visit has the answer", () => {
        assert.sameMembers(search(EDUCATION, [{uuid: SECONDARY}], CustomFilter.scope.Encounter), ["sec-1", "sec-2"]);
    });

    it("a text filter on a visit finds the people whose visit has the text", () => {
        assert.sameMembers(search(NOTES, [{name: "follow"}], CustomFilter.scope.Encounter), ["noted"]);
    });

    [CustomFilter.scope.ProgramEnrolment, CustomFilter.scope.ProgramEncounter].forEach(scope => {
        it(`a coded filter on ${scope} finds the people with the answer`, () => {
            assert.sameMembers(search(EDUCATION, [{uuid: SECONDARY}], scope), ["sec-1", "sec-2"]);
        });

        it(`a text filter on ${scope} finds the people with the text`, () => {
            assert.sameMembers(search(NOTES, [{name: "follow"}], scope), ["noted"]);
        });
    });

    [CustomFilter.scope.Encounter, CustomFilter.scope.ProgramEnrolment, CustomFilter.scope.ProgramEncounter].forEach(scope => {
        it(`a coded dashboard filter on ${scope} finds the people with the answer`, () => {
            assert.sameMembers(dashboard(EDUCATION, [{uuid: SECONDARY}], scope), ["sec-1", "sec-2"]);
        });
    });

    it("leaves out a search filter whose question is not on the device", () => {
        proxy.write(() => proxy.create("Concept", {uuid: EDUCATION, name: "Education", datatype: Concept.dataType.Coded, voided: false}, true));
        const context = {getRepositoryFactory: () => new RepositoryFactory(proxy)};
        const realConceptService = new ConceptService(proxy, context);
        const filterService = new CustomFilterService(proxy, {...context, getService: () => realConceptService});
        filterService.getSettings = () => ({searchFilters: [
            {type: CustomFilter.type.Concept, titleKey: "Education", conceptUUID: EDUCATION, subjectTypeUUID: "st"},
            {type: CustomFilter.type.Concept, titleKey: "Removed question", conceptUUID: "c-not-on-device", subjectTypeUUID: "st"},
        ]});

        assert.deepEqual(filterService.getTopLevelFilters("searchFilters", "st"), []);
        assert.deepEqual(filterService.getBottomLevelFilters("searchFilters", "st").map(f => f.titleKey), ["Education"]);
    });

    // #836 took SUBQUERY out of the Realm query because it hung search on large orgs.
    it("leaves the Realm query without SUBQUERY", () => {
        const query = service.getConceptFilterQueryFunction(concepts[EDUCATION], [{uuid: SECONDARY}])();

        assert.equal(query, ` (observations.concept.uuid == '${EDUCATION}' AND  observations.valueJSON CONTAINS[c] '${SECONDARY}') `);
    });
});
