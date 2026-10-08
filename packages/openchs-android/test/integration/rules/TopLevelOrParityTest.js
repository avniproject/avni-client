// Standard-card criteria arrive bracketed and OR'd; each must translate to SQL whole and return exactly what the JS fallback did.
import {openSeededDb} from "../framework/db/lazyFixture";
import ReportCardQueryBuilder from "../../../src/service/customDashboard/ReportCardQueryBuilder";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import {RealmQueryParser} from "../../../src/framework/db/RealmQueryParser";
import {EntityMappingConfig} from "openchs-models";

const at = new Date("2026-09-01T10:00:00.000Z");
const DATED_PROGRAM_VISIT = [
    ["ProgramEncounter", {uuid: "pe-2-dated", encounterType: {uuid: "et-visit"}, programEnrolment: {uuid: "enl-2"}, encounterDateTime: at, voided: false, observations: []}],
    ["Individual", {uuid: "ind-quoted", firstName: "Tom AND Jerry", subjectType: {uuid: "st-household"}, registrationDate: at, voided: false, observations: []}],
    ["ProgramEnrolment", {uuid: "enl-quoted", program: {uuid: "pr-mother"}, individual: {uuid: "ind-quoted"}, enrolmentDateTime: at, voided: false, observations: []}],
];
const parse = (query) => RealmQueryParser.parse(query, [], "Individual", SchemaGenerator.buildRealmSchemaMap(EntityMappingConfig.getInstance()));

const person = [{uuid: "st-person"}];
const mother = [{uuid: "pr-mother"}];
const visit = [{uuid: "et-visit"}];

describe("bracketed and top-level OR criteria translate to SQL", () => {
    let db;

    beforeEach(() => {
        db = openSeededDb(DATED_PROGRAM_VISIT);
    });

    afterEach(() => db.rawDb.close());

    const run = (criteria) => {
        const results = db.proxy.objects("Individual").filtered("voided = false").filtered(criteria);
        return {uuids: results.map(subject => subject.uuid), fallbacks: results.jsFallbackFilters.length};
    };

    it("translates a Total card's OR of enrolment-visit and general-visit branches", () => {
        const criteria = ReportCardQueryBuilder.getSubjectCriteria(person, mother, visit);
        expect(criteria).toMatch(/\) OR \(/);

        expect(run(criteria)).toEqual({uuids: ["ind-1", "ind-2"], fallbacks: 0});
    });

    it("translates a Total card's single bracketed AND with an enrolment subquery", () => {
        const criteria = ReportCardQueryBuilder.getSubjectCriteria(person, mother, []);

        expect(run(criteria)).toEqual({uuids: ["ind-1", "ind-2"], fallbacks: 0});
    });

    it("keeps a branch that matches nobody from widening the result", () => {
        const criteria = ReportCardQueryBuilder.getSubjectCriteria([{uuid: "st-household"}], mother, visit);

        expect(run(criteria)).toEqual({uuids: [], fallbacks: 0});
    });

    it("translates an OR of plain comparisons inside redundant brackets", () => {
        expect(run('( ( ( firstName = "Asha" ) ) OR ( ( firstName = "Bina" ) ) )')).toEqual({uuids: ["ind-1", "ind-2"], fallbacks: 0});
    });

    it("binds $N arguments in the order the branches appear", () => {
        const results = db.proxy.objects("Individual").filtered(
            '( ( firstName = $0 AND SUBQUERY(enrolments, $e, $e.voided = false).@count > 0 ) OR ( firstName = $1 ) )', "Bina", "Worker");
        expect(results.map(subject => subject.uuid)).toEqual(["ind-2", "ind-user"]);
        expect(results.jsFallbackFilters.length).toBe(0);
    });

    it("leaves an OR with an untranslatable branch to the JS fallback, with the same rows", () => {
        const criteria = "( ( firstName = \"Home\" ) OR ( SUBQUERY(enrolments, $e, firstName = 'nobody').@count > 0 ) )";
        const result = run(criteria);

        expect(result.fallbacks).toBe(1);
        expect(result.uuids).toEqual(["ind-hh"]);
    });

    describe("only an OR takes the row-filter path", () => {
        it("leaves a bracketed AND as a plain WHERE that SQLite can serve from indexes", () => {
            const parsed = parse(ReportCardQueryBuilder.getSubjectCriteria(person, mother, []));
            expect(parsed.unsupported).toBeFalsy();
            expect(parsed.where).not.toMatch(/CASE WHEN/);
        });

        it("parses an unbracketed AND chain exactly as before", () => {
            const parsed = parse('voided = false AND SUBQUERY(enrolments, $e, $e.voided = false).@count > 0');
            expect(parsed.where).not.toMatch(/CASE WHEN/);
            expect(parsed.partialParse).toBe(true);
        });

        it("pushes the translatable part of a bracketed AND into SQL when another part stays on the fallback", () => {
            const criteria = "( ( firstName = \"Home\" ) AND ( SUBQUERY(enrolments, $e, firstName = 'nobody').@count > 0 ) )";
            const parsed = parse(criteria);
            expect(parsed.where).toMatch(/first_name/);
            expect(parsed.skippedClauses).toHaveLength(1);
            expect(run(criteria)).toEqual({uuids: [], fallbacks: 1});
        });

        it("does not split on an AND inside a quoted value", () => {
            const criteria = 'SUBQUERY(enrolments, $e, $e.voided = false).@count > 0 AND firstName = "Tom AND Jerry"';
            expect(run(criteria)).toEqual({uuids: ["ind-quoted"], fallbacks: 0});
        });
    });
});
