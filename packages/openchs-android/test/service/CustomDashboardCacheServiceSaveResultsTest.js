// Verifies that saving a dashboard card's count replaces the count saved for it before, for every card, single and
// nested. With auto refresh off the dashboard shows the saved counts, and it reads the first one saved for a card, so a
// count that was never replaced is shown long after it was counted. The cache here is a real CustomDashboardCache over
// a plain stored list, so a removal that changes only a copy of the list fails here as it does on the phone.

import {assert} from "chai";
import {CustomDashboardCache, NestedReportCardResult, ReportCard, ReportCardResult} from "openchs-models";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import CustomDashboardCacheService from "../../src/service/CustomDashboardCacheService";

const DASHBOARD = "d";

function card(uuid) {
    const reportCard = ReportCard.newReportCard();
    reportCard.uuid = uuid;
    return reportCard;
}

const A = card("A");
const B = card("B");
const N = card("N");
const M = card("M");

// A count as the cache stores it: the plain object under the model wrapper.
function stored(reportCardKey, primaryValue, dashboard = DASHBOARD) {
    const result = ReportCardResult.create(primaryValue, null, true);
    result.reportCard = reportCardKey;
    result.dashboard = dashboard;
    return result.that;
}

function storedSubCount(reportCardKey, primaryValue, dashboard = DASHBOARD) {
    const result = NestedReportCardResult.create(primaryValue, null, true, false, reportCardKey);
    result.reportCard = reportCardKey;
    result.dashboard = dashboard;
    return result.that;
}

const count = (primaryValue) => ReportCardResult.create(primaryValue, null, true);
const subCount = (primaryValue) => NestedReportCardResult.create(primaryValue, null, true, false, null);

// The service over one dashboard's cache. Writes run at once; the save is recorded.
function serviceOver({single = [], nested = [], updatedAt = null} = {}) {
    const cache = new CustomDashboardCache({
        uuid: "cache-1",
        dashboard: {uuid: DASHBOARD},
        reportCardResults: single,
        nestedReportCardResults: nested,
        updatedAt,
    });
    const service = Object.create(CustomDashboardCacheService.prototype);
    const persistMutations = jest.fn();
    // Getters on BaseService, so they are defined on the instance rather than assigned.
    Object.defineProperty(service, "transactionManager", {value: {write: (fn) => fn()}});
    Object.defineProperty(service, "repository", {value: {persistMutations}});
    service.findByFiltered = () => cache;
    return {service, cache, persistMutations};
}

// What the cache holds, in order, as [card key, value, dashboard].
const holdsSingle = (cache) => cache.that.reportCardResults.map((x) => [x.reportCard, x.primaryValue, x.dashboard]);
const holdsNested = (cache) => cache.that.nestedReportCardResults.map((x) => [x.reportCard, x.primaryValue, x.dashboard]);
const entriesFor = (rows, key) => rows.filter(([reportCard]) => reportCard === key);

describe("CustomDashboardCacheService, saving a card's count", () => {
    describe("a single card", () => {
        it("batchUpdateResults replaces the count saved for it before", () => {
            const {service, cache, persistMutations} = serviceOver({
                single: [stored("A", "7"), stored("B", "5"), stored("A", "3", "other")],
            });

            service.batchUpdateResults(DASHBOARD, [{card: A, result: count("8")}], []);

            const rows = holdsSingle(cache);
            assert.deepEqual(entriesFor(rows, "A"), [["A", "3", "other"], ["A", "8", DASHBOARD]], "one count for A on this dashboard, the new one");
            assert.deepEqual(entriesFor(rows, "B"), [["B", "5", DASHBOARD]]);
            assert.equal(cache.getReportCardResult(A).primaryValue, "8");
            assert.equal(persistMutations.mock.calls.length, 1);
        });

        it("updateReportCardResult replaces the count saved for it before and leaves every other card's", () => {
            // B is saved last, so a removal that drops the last entry instead of A's would lose B's count.
            const {service, cache} = serviceOver({single: [stored("A", "7"), stored("B", "5")]});

            service.updateReportCardResult(DASHBOARD, A, count("8"));

            const rows = holdsSingle(cache);
            assert.deepEqual(entriesFor(rows, "A"), [["A", "8", DASHBOARD]]);
            assert.deepEqual(entriesFor(rows, "B"), [["B", "5", DASHBOARD]]);
            assert.equal(cache.getReportCardResult(A).primaryValue, "8");
        });

        it("batchUpdateResults given no result for a card drops its saved count and saves none", () => {
            const {service, cache, persistMutations} = serviceOver({single: [stored("A", "7"), stored("B", "5"), stored("A", "6")]});

            service.batchUpdateResults(DASHBOARD, [{card: A, result: null}], []);

            const rows = holdsSingle(cache);
            assert.deepEqual(entriesFor(rows, "A"), []);
            assert.deepEqual(entriesFor(rows, "B"), [["B", "5", DASHBOARD]]);
            assert.isUndefined(cache.getReportCardResult(A));
            assert.equal(persistMutations.mock.calls.length, 1);
        });

        it("a dropped count alone leaves the time the counts were last saved; a saved one moves it", () => {
            const old = new Date("2026-11-01T10:00:00.000Z");
            const dropped = serviceOver({single: [stored("A", "7"), stored("B", "5")], updatedAt: old});

            dropped.service.batchUpdateResults(DASHBOARD, [{card: A, result: null}], []);

            assert.deepEqual(entriesFor(holdsSingle(dropped.cache), "A"), []);
            assert.equal(dropped.persistMutations.mock.calls.length, 1, "the drop is written");
            assert.equal(dropped.cache.updatedAt.getTime(), old.getTime());

            const saved = serviceOver({single: [stored("A", "7"), stored("B", "5")], updatedAt: old});
            saved.service.batchUpdateResults(DASHBOARD, [{card: A, result: null}, {card: B, result: count("6")}], []);
            assert.isAbove(saved.cache.updatedAt.getTime(), old.getTime());
        });

        it("a card saved more than once by earlier builds ends with one count, the new one", () => {
            const {service, cache} = serviceOver({single: [stored("A", "7"), stored("A", "6"), stored("B", "5")]});

            service.batchUpdateResults(DASHBOARD, [{card: A, result: count("8")}], []);

            assert.deepEqual(entriesFor(holdsSingle(cache), "A"), [["A", "8", DASHBOARD]]);
            assert.equal(cache.getReportCardResult(A).primaryValue, "8");
        });
    });

    describe("a nested card", () => {
        // Sub-counts are saved under the sub-card's key, as batchUpdateResults writes them.
        const savedSubCounts = () => [storedSubCount(N.getCardId(0), "1"), storedSubCount(N.getCardId(1), "2"), storedSubCount(M.getCardId(0), "9")];

        it("batchUpdateResults replaces each sub-card's count saved before", () => {
            const {service, cache} = serviceOver({nested: savedSubCounts()});

            service.batchUpdateResults(DASHBOARD, [], [{card: N, results: [subCount("3"), subCount("4")]}]);

            const rows = holdsNested(cache);
            assert.deepEqual(entriesFor(rows, N.getCardId(0)), [[N.getCardId(0), "3", DASHBOARD]]);
            assert.deepEqual(entriesFor(rows, N.getCardId(1)), [[N.getCardId(1), "4", DASHBOARD]]);
            assert.deepEqual(entriesFor(rows, M.getCardId(0)), [[M.getCardId(0), "9", DASHBOARD]]);
        });

        it("updateNestedCardResults replaces each sub-card's count saved before and leaves every other card's", () => {
            const {service, cache} = serviceOver({nested: savedSubCounts()});

            service.updateNestedCardResults(DASHBOARD, N, [subCount("3"), subCount("4")]);

            const rows = holdsNested(cache);
            assert.deepEqual(entriesFor(rows, N.getCardId(0)), [[N.getCardId(0), "3", DASHBOARD]]);
            assert.deepEqual(entriesFor(rows, N.getCardId(1)), [[N.getCardId(1), "4", DASHBOARD]]);
            assert.deepEqual(entriesFor(rows, M.getCardId(0)), [[M.getCardId(0), "9", DASHBOARD]]);
        });
    });
});
