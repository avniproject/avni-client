/**
 * A coded custom search filter must find the subjects whose answer to that question is the
 * chosen option. On SQLite it found no one: the coded query compared the whole observations
 * list instead of one observation at a time.
 *
 * Run: npx jest --selectProjects integration --testPathPattern CustomFilterCodedQueryTest
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {EntityMappingConfig, Concept} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import CustomFilterService from "../../../src/service/CustomFilterService";
import {open} from "@op-engineering/op-sqlite";

const EDUCATION = "c-education";
const PRIMARY = "a-primary";
const SECONDARY = "a-secondary";
const OCCUPATION = "c-occupation";
const answer = (concept, answerUuid) => ({concept: {uuid: concept}, valueJSON: JSON.stringify({answer: answerUuid})});

describe("coded custom search filter on SQLite", () => {
    let rawDb, proxy, service;
    const education = {uuid: EDUCATION, datatype: Concept.dataType.Coded};

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
            const person = (uuid, observations) => create("Individual", {uuid, firstName: uuid, registrationDate: new Date(2026, 0, 1), voided: false, subjectType: {uuid: "st"}, observations});
            person("kumar", [answer(EDUCATION, PRIMARY)]);
            person("sec-1", [answer(OCCUPATION, "a-farmer"), answer(EDUCATION, SECONDARY)]);
            person("sec-2", [answer(EDUCATION, SECONDARY)]);
            // Has the question and the option, but on different questions: not a Secondary match.
            person("mixed", [answer(EDUCATION, PRIMARY), answer(OCCUPATION, SECONDARY)]);
            person("none", []);
        });

        service = new CustomFilterService(proxy, {getService: () => ({})});
    });

    afterEach(() => rawDb && rawDb.close());

    const matching = (query) => proxy.objects("Individual").filtered(query).map(individual => individual.uuid);

    it("finds the people who chose the option", () => {
        const query = service.getConceptFilterQueryFunction(education, [{uuid: SECONDARY}])();

        assert.sameMembers(matching(query), ["sec-1", "sec-2"]);
    });

    it("finds a person whose answer is the only observation", () => {
        const query = service.getConceptFilterQueryFunction(education, [{uuid: PRIMARY}])();

        assert.sameMembers(matching(query), ["kumar", "mixed"]);
    });

    it("finds people who chose any of several options", () => {
        const query = service.getConceptFilterQueryFunction(education, [{uuid: PRIMARY}, {uuid: SECONDARY}])();

        assert.sameMembers(matching(query), ["kumar", "sec-1", "sec-2", "mixed"]);
    });

    it("does the same for dashboard filters", () => {
        const query = service.getConceptFilterQueryFunctionV2(education, [{uuid: SECONDARY}])();

        assert.sameMembers(matching(query), ["sec-1", "sec-2"]);
    });

    // #836 took SUBQUERY out of the Realm query because it hung search on large orgs.
    it("leaves the Realm query without SUBQUERY", () => {
        const realmService = new CustomFilterService({}, {getService: () => ({})});
        const query = realmService.getConceptFilterQueryFunction(education, [{uuid: SECONDARY}])();

        assert.equal(query, ` (observations.concept.uuid == '${EDUCATION}' AND  observations.valueJSON CONTAINS[c] '${SECONDARY}') `);
    });
});
