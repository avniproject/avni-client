// Regression guards for RuleEvaluationService entry points that are called
// from auto-share / work-item-dispatch paths with no enclosing WorkLists.
// Prevents a recurrence of the NPE that swallowed every SHARE_SESSION
// failure-telemetry call (see code review #1).

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));

import RuleEvaluationService from "../../src/service/RuleEvaluationService";
import {SqliteResultsProxy} from "../../src/framework/db/SqliteResultsProxy";

function makeService() {
    const svc = new RuleEvaluationService({}, {beansMap: new Map()});
    svc.saveFailedRules = jest.fn();
    svc.findOnly = jest.fn(() => ({uuid: "org-1"}));  // OrganisationConfig stub
    return svc;
}

const schemaMap = new Map([["Individual", {
    name: "Individual",
    primaryKey: "uuid",
    properties: {uuid: "string", firstName: "string", voided: {type: "bool", default: false}}
}]]);

class MockEntity {
    constructor(obj) {
        Object.assign(this, obj);
    }
}

function makeProxy({rows = [{uuid: "a"}, {uuid: "b"}, {uuid: "c"}], extra = {}} = {}) {
    // Honours LIMIT, so a limited query really does yield fewer rows than COUNT(*) reports —
    // without that the guard's own test passes whether or not the guard is there.
    const executeQuery = jest.fn(sql => {
        if (/COUNT\(\*\)/i.test(sql)) return [{cnt: rows.length}];
        const limit = sql.match(/LIMIT\s+(\d+)/i);
        return limit ? rows.slice(0, Number(limit[1])) : rows;
    });
    const hydrator = {
        beginHydrationSession: jest.fn(),
        endHydrationSession: jest.fn(),
        hydrate: jest.fn((schemaName, row) => ({...row}))
    };
    const proxy = SqliteResultsProxy.create({
        schemaName: "Individual",
        tableName: "individual",
        entityClass: MockEntity,
        executeQuery,
        hydrator,
        realmSchemaMap: schemaMap,
        ...extra
    });
    return {proxy, executeQuery, hydrator};
}

// #2075 — the probe ran first and hydrated every row, so fixing only the count read
// measured as no improvement at all. The ordering is the card, not a detail of it.
describe("#2075 isOldStyleQueryResult — must not hydrate", () => {
    it("does not execute the query when probing a lazy SQLite collection", () => {
        const svc = makeService();
        const {proxy, executeQuery} = makeProxy();

        assert.isTrue(svc.isOldStyleQueryResult(proxy), "a collection is still old-style");

        assert.isFalse(proxy._executed, "probe must leave the proxy unexecuted");
        assert.equal(executeQuery.mock.calls.length, 0, "probe must issue no SQL");
    });

    it("still hydrates on a real .length read, so the guard above is meaningful", () => {
        const {proxy, executeQuery} = makeProxy();

        assert.equal(proxy.length, 3);

        assert.isTrue(proxy._executed);
        assert.equal(executeQuery.mock.calls.length, 1);
    });
});

// #2075 — the card's number must come from COUNT(*), not from loading every row it counts.
describe("#2075 getDashboardCardResult — counts without loading", () => {
    const card = {name: "Facilities", nested: false};

    function cardResultFor(queryResult) {
        const svc = makeService();
        svc.executeDashboardCardRule = jest.fn(() => queryResult);
        return svc.getDashboardCardResult(card, {});
    }

    it("routes a countable collection through COUNT(*) and hydrates nothing", () => {
        const {proxy, executeQuery} = makeProxy({rows: [{uuid: "a"}, {uuid: "b"}, {uuid: "c"}]});

        const result = cardResultFor(proxy);

        assert.equal(result.primaryValue, "3", "the displayed number is unchanged");
        assert.isFalse(proxy._executed, "no rows may be loaded to produce the number");
        assert.equal(executeQuery.mock.calls.length, 1, "exactly one query, and it is the count");
        assert.match(executeQuery.mock.calls[0][0], /COUNT\(\*\)/i);
    });

    it("counts a guarded collection the old way, so its number cannot move", () => {
        const {proxy, executeQuery} = makeProxy({rows: [{uuid: "a"}, {uuid: "b"}, {uuid: "c"}]});
        const limited = proxy.filtered("voided = false limit(2)");

        const result = cardResultFor(limited);

        // COUNT(*) would report 3 here; .length is 2 because LIMIT applies. Without the guard
        // this assertion reads "3" — that difference is the whole reason the guard exists.
        assert.equal(result.primaryValue, "2", "same value .length yields today");
        assert.isTrue(limited._executed, "a guarded query still materialises");
        assert.notMatch(executeQuery.mock.calls[0][0], /COUNT\(\*\)/i);
    });

    it("falls back to loading the rows if COUNT(*) fails, rather than breaking the card", () => {
        const {proxy} = makeProxy({rows: [{uuid: "a"}, {uuid: "b"}, {uuid: "c"}]});
        proxy.count = () => {
            throw new Error("no such column: t0.whatever");
        };

        const result = cardResultFor(proxy);

        assert.equal(result.primaryValue, "3", "a card that worked before must still show its number");
    });

    it("reads the collection once — the log line and the displayed number share one count", () => {
        const {proxy, executeQuery} = makeProxy();

        cardResultFor(proxy);

        assert.equal(executeQuery.mock.calls.length, 1, "counting twice would double every card's SQL");
    });
});

// #2075 — replacing the probe is the regression risk: a result shape that changes branch
// changes a displayed number. These pin the four #877 shapes plus a bare number to today's
// values. They pass identically before and after the change; that is the point of them.
describe("#2075 result-shape branch table is unchanged", () => {
    function resultFor(queryResult, card = {name: "C", nested: false}) {
        const svc = makeService();
        svc.executeDashboardCardRule = jest.fn(() => queryResult);
        return svc.getDashboardCardResult(card, {});
    }

    it("a plain array still counts by length", () => {
        assert.equal(resultFor([{uuid: "a"}, {uuid: "b"}]).primaryValue, "2");
    });

    it("an empty array still reads zero, not blank", () => {
        assert.equal(resultFor([]).primaryValue, "0");
    });

    it("{primaryValue, lineListFunction} is still read as a card object, not counted", () => {
        const result = resultFor({primaryValue: 42, lineListFunction: () => []});
        assert.equal(result.primaryValue, "42");
        assert.isTrue(result.clickable, "a lineListFunction makes the card tappable");
    });

    it("{primaryValue} with no lineListFunction stays untappable", () => {
        const result = resultFor({primaryValue: 7});
        assert.equal(result.primaryValue, "7");
        assert.isFalse(result.clickable);
    });

    it("a bare number is still not treated as a collection", () => {
        // Today it falls to fromQueryResult, which finds no primaryValue and renders blank.
        // Preserved deliberately — this change is not the place to fix it.
        assert.equal(resultFor(5).primaryValue, "");
    });

    it("a live collection still counts", () => {
        const {proxy} = makeProxy({rows: [{uuid: "a"}, {uuid: "b"}]});
        assert.equal(resultFor(proxy).primaryValue, "2");
    });

    // A rule returns whatever its author wrote. An object that merely happens to own a count()
    // is not a collection, and must not be counted as one — the probe and the count path have
    // to agree on what "countable" means, or the number falls through to undefined.
    it("a card object that happens to carry a count() is still read as a card object", () => {
        const result = resultFor({primaryValue: 10, count: () => 5});
        assert.equal(result.primaryValue, "10", "the rule's own number wins over an incidental count()");
    });

    it("an object with count() but no length is not mistaken for a collection", () => {
        // The shape a repository or query builder has: count() exists, length does not.
        assert.equal(resultFor({count: () => 7, primaryValue: 7}).primaryValue, "7");
    });
});

// #2075 — right number over the wrong list is the failure this change can cause. The drill-down
// reads rows legitimately and must be untouched by the probe change.
describe("#2075 getDashboardCardQueryResult — the drill-down still returns rows", () => {
    const card = {name: "Facilities", nested: false};

    function queryResultFor(queryResult) {
        const svc = makeService();
        svc.executeDashboardCardRule = jest.fn(() => queryResult);
        return svc.getDashboardCardQueryResult(card, {});
    }

    it("hands back the collection itself, and reading it still yields every row", () => {
        const {proxy, executeQuery} = makeProxy({rows: [{uuid: "a"}, {uuid: "b"}, {uuid: "c"}]});

        const rows = queryResultFor(proxy);

        assert.equal(rows.length, 3, "the list behind the card is complete");
        assert.isTrue(proxy._executed, "the drill-down does materialise — it wants the rows");
        assert.notMatch(executeQuery.mock.calls[0][0], /COUNT\(\*\)/i, "the list path never counts");
    });

    it("hands back a plain array untouched", () => {
        const rows = [{uuid: "a"}, {uuid: "b"}];
        assert.deepEqual(queryResultFor(rows), rows);
    });

    it("invokes the lineListFunction for a card-object result", () => {
        const listRows = [{uuid: "x"}];
        const rows = queryResultFor({primaryValue: 1, lineListFunction: () => listRows});
        assert.deepEqual(rows, listRows);
    });
});

describe("RuleEvaluationService.getIndividualUUID — null safety", () => {
    it("returns null instead of NPEing when entity is null for a 'WorkList' lookup", () => {
        const svc = makeService();
        // Before the fix, this threw "Cannot read property 'getCurrentWorkItem' of null".
        assert.isNull(svc.getIndividualUUID(null, "WorkList"));
    });

    it("returns null for undefined entity regardless of entityName", () => {
        const svc = makeService();
        assert.isNull(svc.getIndividualUUID(undefined, "Individual"));
        assert.isNull(svc.getIndividualUUID(undefined, "ProgramEnrolment"));
        assert.isNull(svc.getIndividualUUID(undefined, "WorkList"));
    });

    it("still routes a valid entity through the per-type branch", () => {
        const svc = makeService();
        assert.equal(svc.getIndividualUUID({uuid: "ind-1"}, "Individual"), "ind-1");
    });
});

describe("RuleEvaluationService.recordWorkListUpdationFailure — null workLists path", () => {
    it("invokes saveFailedRules with a null individualUUID when workLists is null (SHARE_SESSION dispatcher path)", () => {
        const svc = makeService();
        const err = new Error("boom");
        const workItem = {id: "wi-1"};

        svc.recordWorkListUpdationFailure(err, null, {workItem});

        // Pre-fix: this NPE'd inside getIndividualUUID, the inner try/catch logged
        // 'Failed to record WorkListUpdation failure', and saveFailedRules NEVER ran.
        // Post-fix: saveFailedRules runs with individualUUID = null.
        assert.equal(svc.saveFailedRules.mock.calls.length, 1);
        const args = svc.saveFailedRules.mock.calls[0];
        // saveFailedRules(error, ruleUUID, individualUUID, ruleType, sourceUUID, entityType, entityUUID)
        assert.equal(args[0], err);
        assert.equal(args[2], null, "individualUUID derived from null workLists is null");
        assert.equal(args[3], "WorkListUpdation");
        assert.equal(args[5], "WorkList");
        assert.equal(args[6], "wi-1", "entityUUID falls back to workItem.id");
    });
});
