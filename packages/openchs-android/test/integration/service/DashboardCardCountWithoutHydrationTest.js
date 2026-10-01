/**
 * #2075 — a configured dashboard card must produce its number from COUNT(*), not by loading
 * every record the number counts. On JSCS the Facilities card displayed 46,530 and took
 * 93–110 s to do it, with the database answering the same question in 2–7 ms.
 *
 * The card's five acceptance criteria are all on-device. These run the same two claims — the
 * number is unchanged, and nothing is loaded to produce it — against real SQLite in CI.
 *
 * Run: npx jest --selectProjects integration test/integration/service/DashboardCardCountWithoutHydrationTest.js
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));

import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RuleEvaluationService from "../../../src/service/RuleEvaluationService";
import {open} from "@op-engineering/op-sqlite";

const TODAY = new Date(2026, 0, 15);
const SUBJECTS = 2000;
const CARD = {name: "Facilities", nested: false};

describe("#2075 a dashboard card counts without loading what it counts", () => {
    let rawDb, db, service;

    beforeAll(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        db = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        db.write(() => {
            db.create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"}, true, {skipHydration: true});
            for (let i = 0; i < SUBJECTS; i++) {
                db.create("Individual", {
                    uuid: `ind-${i}`,
                    // three distinct names, so a DISTINCT + limit query has something to cut
                    firstName: `Name${i % 3}`,
                    registrationDate: TODAY,
                    voided: i % 10 === 0,          // a tenth are voided, so the filter must bite
                    subjectType: {uuid: "st"}
                }, true, {skipHydration: true});
            }
        });
        db.buildReferenceCache([{schemaName: "SubjectType", depth: 1, skipLists: true}]);

        service = new RuleEvaluationService({}, {beansMap: new Map()});
        service.saveFailedRules = jest.fn();
    }, 120000);

    afterAll(() => rawDb && rawDb.close());

    // The JSCS Facilities rule, exactly: params.db.objects('Individual').filtered("voided == false")
    const facilitiesRule = () => db.objects("Individual").filtered("voided == false");

    function cardResultFor(queryResult) {
        service.executeDashboardCardRule = jest.fn(() => queryResult);
        return service.getDashboardCardResult(CARD, {});
    }

    it("shows the same number it shows today", () => {
        const expected = SUBJECTS - SUBJECTS / 10;

        assert.equal(cardResultFor(facilitiesRule()).primaryValue, String(expected));
        assert.equal(facilitiesRule().length, expected, "and the drill-down agrees with the card");
    });

    it("loads nothing to produce that number", () => {
        const results = facilitiesRule();

        cardResultFor(results);

        assert.isFalse(results._executed, "no row may be hydrated to display a count");
    });

    it("counts faster than the drill-down that hydrates the same rows", () => {
        const countStart = Date.now();
        cardResultFor(facilitiesRule());
        const countMs = Date.now() - countStart;

        const listStart = Date.now();
        const listLength = facilitiesRule().length;
        const listMs = Date.now() - listStart;

        console.log(`card count: ${countMs}ms   drill-down hydration: ${listMs}ms   (${listLength} of ${SUBJECTS} subjects)`);
        assert.isBelow(countMs, listMs, "counting must not cost what loading costs");
    }, 120000);

    // 30 of the 455 live card rules (6 orgs) are distinct with no limit. _buildSql windows those
    // via ROW_NUMBER, so COUNT(*) counts the same set .length would materialise — they belong on
    // the fast path. Parity is asserted here because that is what makes it safe to allow.
    describe("unlimited distinct counts in SQL, and counts the same", () => {
        // Three distinct firstNames across 2000 subjects.
        const distinctNames = () => db.objects("Individual").filtered("TRUEPREDICATE DISTINCT(firstName)");

        it("agrees with .length", () => {
            assert.equal(distinctNames().count(), 3);
            assert.equal(distinctNames().length, 3, "count() must not see a different set than the list does");
        });

        it("is allowed through the guard, so the card stops hydrating to count", () => {
            const results = distinctNames();

            assert.isTrue(results.canCountInSql());
            assert.equal(cardResultFor(results).primaryValue, "3");
            assert.isFalse(results._executed, "a distinct card must not load every row either");
        });
    });

    // The guard, against real SQL. count() strips LIMIT deliberately (SqliteResultsProxy:508),
    // so on a limited query it answers a different question than .length — QA measured 3 vs 2
    // on #1977. A card that got faster here would be a card whose number moved.
    describe("the guard on a limited distinct", () => {
        const limitedDistinct = () => db.objects("Individual").filtered("TRUEPREDICATE DISTINCT(firstName) limit(2)");

        it("count() and .length genuinely disagree, which is why the guard exists", () => {
            assert.equal(limitedDistinct().length, 2, "LIMIT applies to the rows");
            assert.equal(limitedDistinct().count(), 3, "COUNT(*) sees all three distinct names");
        });

        it("refuses to count in SQL, so the card keeps today's number", () => {
            const results = limitedDistinct();

            assert.isFalse(results.canCountInSql());
            assert.equal(cardResultFor(results).primaryValue, "2", "the number must not move to 3");
        });
    });
});
