// Verifies which card numbers CustomDashboardActions.refreshCount makes tappable. A card with the Open dashboard action
// opens its dashboard whatever its query returns, so its number is tappable even when the query gives a value with no
// line list, unless the result is an error. Single and nested cards alike. Every other card keeps the tappable flag its
// result came with, and a cached result stays tappable as it is today. A query that fails is run through the real rule
// service, because the tile it builds for a failure arrives already marked tappable.

import {assert} from "chai";
import _ from "lodash";
import {CustomDashboardCache, NestedReportCardResult, ReportCard, ReportCardResult} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import CustomDashboardService from "../../../src/service/customDashboard/CustomDashboardService";
import CustomDashboardCacheService from "../../../src/service/CustomDashboardCacheService";
import UserInfoService from "../../../src/service/UserInfoService";
import ReportCardService from "../../../src/service/customDashboard/ReportCardService";
import MessageService from "../../../src/service/MessageService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import RuleEvaluationService from "../../../src/service/RuleEvaluationService";

const DASHBOARD = "dashboard-1";

function card(uuid, {action = null, nested = false, countOfCards = 1} = {}) {
    const reportCard = ReportCard.newReportCard();
    reportCard.uuid = uuid;
    reportCard.name = uuid;
    reportCard.action = action;
    reportCard.nested = nested;
    reportCard.countOfCards = countOfCards;
    return reportCard;
}

const openDashboardCard = (uuid, options = {}) => card(uuid, {...options, action: ReportCard.actionTypes.OpenDashboard});

// What a query gives: a value with no line list, or an error.
const valueOnly = (primaryValue = "12") => ({primaryValue, secondaryValue: null});
const anError = () => ({primaryValue: "Error", secondaryValue: "The query failed", hasErrorMsg: true});

// The tile the phone builds when a card's query throws: the real RuleEvaluationService.getDashboardCardResult, with only
// translation, failure logging and the rule run itself stubbed. Translation gives the key back.
function failedQueryTile(reportCard) {
    const rules = Object.create(RuleEvaluationService.prototype);
    rules.I18n = {t: (key) => key};
    rules.saveFailedRules = () => {};
    rules.getCommonParams = () => ({});
    rules.runEvalRule = () => {
        throw new Error("The query failed");
    };
    return rules.getDashboardCardResult(reportCard, []);
}

// A result saved in the dashboard's cache, as a refresh with auto refresh on leaves it.
function cachedResult(reportCard, primaryValue = "7") {
    const result = ReportCardResult.create(primaryValue, null, false);
    result.reportCard = reportCard.uuid;
    result.dashboard = DASHBOARD;
    return result;
}

// The dashboard's cache, read through the models' own CustomDashboardCache methods, as the phone reads it.
function dashboardCacheHolding(singleResults, nestedResults) {
    return {
        dashboard: {uuid: DASHBOARD},
        reportCardResults: singleResults,
        nestedReportCardResults: nestedResults,
        updatedAt: null,
        filterApplied: false,
        getReportCardResult(reportCard) {
            return CustomDashboardCache.prototype.getReportCardResult.call(this, reportCard);
        },
        getNestedReportCardResults(reportCard) {
            return CustomDashboardCache.prototype.getNestedReportCardResults.call(this, reportCard);
        },
    };
}

// A failed count saved by an earlier build, as the cache hands it back: its two lines, with the error flag lost.
function savedFailure(reportCard) {
    const result = ReportCardResult.create("Error", "queryExecutionError", false, true);
    result.reportCard = reportCard.uuid;
    result.dashboard = DASHBOARD;
    return result;
}

// A cache service that records what refreshCount saves, and saves nothing.
function recordingCacheService(dashboardCache) {
    const updates = [];
    const batches = [];
    return {
        getDashboardCache: () => ({dashboardCache}),
        updateReportCardResult: (dashboardUUID, reportCard, result) => updates.push({card: reportCard.uuid, result}),
        batchUpdateResults: (dashboardUUID, single, nested) => batches.push({single, nested}),
        updates,
        batches,
    };
}

// The real cache service over one real CustomDashboardCache, so what one refresh saves is what the next one reads.
function realCacheServiceOver(cache) {
    const service = Object.create(CustomDashboardCacheService.prototype);
    // Getters on BaseService, so they are defined on the instance rather than assigned.
    Object.defineProperty(service, "transactionManager", {value: {write: (fn) => fn()}});
    Object.defineProperty(service, "repository", {value: {persistMutations: () => {}}});
    service.findByFiltered = () => cache;
    service.getDashboardCache = () => ({dashboardCache: cache});
    return service;
}

// Runs refreshCount over `cards`. `fresh` gives each card's freshly computed result by card uuid. Returns the tiles
// shown, the cache service, and the cards counted.
function runRefresh(cards, {fresh = {}, cached = [], cachedNested = [], autoRefreshEnabled = true, cacheService} = {}) {
    const service = cacheService || recordingCacheService(dashboardCacheHolding(cached, cachedNested));
    const getReportCardCount = jest.fn((reportCard) => fresh[reportCard.uuid]);
    const services = new Map([
        [CustomDashboardService, {getDashboardData: () => ({selectedFilterValues: {}})}],
        [CustomDashboardCacheService, service],
        [UserInfoService, {getUserSettingsObject: () => ({autoRefreshEnabled})}],
        [ReportCardService, {db: null, getReportCardCount}],
        [MessageService, {getI18n: () => ({t: (key) => key})}],
        [DashboardFilterService, {toRuleInputObjects: () => []}],
    ]);
    const state = {
        ...CustomDashboardActions.getInitialState(),
        dashboards: [{uuid: DASHBOARD}],
        activeDashboardUUID: DASHBOARD,
        reportCardSectionMappings: cards.map((reportCard) => ({card: reportCard})),
    };
    const map = CustomDashboardActions.refreshCount(state, {}, {get: (Class) => services.get(Class)}).cardToCountResultMap;
    return {map, cacheService: service, counted: getReportCardCount.mock.calls.map(([reportCard]) => reportCard.uuid)};
}

const refresh = (cards, options) => runRefresh(cards, options).map;

describe("CustomDashboardActions.refreshCount, which numbers can be tapped", () => {
    describe("a single card", () => {
        it("with Open dashboard is tappable when its query gives a value with no line list", () => {
            const reportCard = openDashboardCard("open");
            const fresh = {open: ReportCardResult.fromQueryResult(valueOnly())};
            assert.isFalse(fresh.open.clickable, "the query's own result is not tappable");

            const result = refresh([reportCard], {fresh})[reportCard.getCardId()];

            assert.strictEqual(result, fresh.open);
            assert.isTrue(result.clickable);
            assert.equal(result.primaryValue, "12");
        });

        it("with Open dashboard is not tappable when its query gives an error", () => {
            const reportCard = openDashboardCard("open");
            const fresh = {open: ReportCardResult.fromQueryResult(anError())};

            const result = refresh([reportCard], {fresh})[reportCard.getCardId()];

            assert.isTrue(result.hasErrorMsg);
            assert.isFalse(result.clickable);
        });

        it("with Open dashboard is not tappable when its query fails, as the phone builds the failed tile", () => {
            const reportCard = openDashboardCard("open");
            const fresh = {open: failedQueryTile(reportCard)};
            assert.isTrue(fresh.open.hasErrorMsg, "the failed tile is an error");
            assert.isTrue(fresh.open.clickable, "the failed tile arrives marked tappable");

            const result = refresh([reportCard], {fresh})[reportCard.getCardId()];

            assert.strictEqual(result, fresh.open);
            assert.equal(result.primaryValue, "Error");
            assert.equal(result.secondaryValue, "queryExecutionError");
            assert.isTrue(result.hasErrorMsg);
            assert.isFalse(result.clickable);
        });

        it("without an action, a tile whose query fails keeps the flag it came with", () => {
            const reportCard = card("plain");
            const fresh = {plain: failedQueryTile(reportCard)};

            const result = refresh([reportCard], {fresh})[reportCard.getCardId()];

            assert.isTrue(result.hasErrorMsg);
            assert.isTrue(result.clickable, "other cards are outside this card's scope");
        });

        it("without an action, a Custom Data Card whose query gives a value is still not tappable", () => {
            [null, ReportCard.actionTypes.ViewSubjectProfile].forEach((action) => {
                const reportCard = card("plain", {action});
                const fresh = {plain: ReportCardResult.fromQueryResult(valueOnly())};

                const result = refresh([reportCard], {fresh})[reportCard.getCardId()];

                assert.isFalse(result.clickable, `action ${action}`);
            });
        });

        it("with Open dashboard and auto refresh off is tappable from the cache, as today", () => {
            const reportCard = openDashboardCard("open");

            const result = refresh([reportCard], {cached: [cachedResult(reportCard)], autoRefreshEnabled: false})[reportCard.getCardId()];

            assert.equal(result.primaryValue, "7", "the cached result is the one shown");
            assert.isTrue(result.clickable);
        });
    });

    describe("a nested card", () => {
        const subResults = (reportCard, queryResults) => queryResults.map((queryResult, index) =>
            NestedReportCardResult.fromQueryResult(queryResult, reportCard, index));

        it("with Open dashboard makes every sub-card tappable when its query gives values with no line list", () => {
            const reportCard = openDashboardCard("open", {nested: true, countOfCards: 2});
            const fresh = {open: subResults(reportCard, [valueOnly("3"), valueOnly("4")])};

            const map = refresh([reportCard], {fresh});

            [0, 1].forEach((index) => assert.isTrue(map[reportCard.getCardId(index)].clickable, `sub-card ${index}`));
        });

        it("with Open dashboard leaves a sub-card with an error not tappable", () => {
            const reportCard = openDashboardCard("open", {nested: true, countOfCards: 2});
            const fresh = {open: subResults(reportCard, [anError(), valueOnly("4")])};

            const map = refresh([reportCard], {fresh});

            assert.isFalse(map[reportCard.getCardId(0)].clickable, "the sub-card with an error");
            assert.isTrue(map[reportCard.getCardId(1)].clickable, "the sub-card with a value");
        });

        it("with Open dashboard makes no sub-card tappable when its query fails, as the phone builds the failed tiles", () => {
            const reportCard = openDashboardCard("open", {nested: true, countOfCards: 2});
            const fresh = {open: failedQueryTile(reportCard)};

            const map = refresh([reportCard], {fresh});

            [0, 1].forEach((index) => {
                assert.isTrue(map[reportCard.getCardId(index)].hasErrorMsg, `sub-card ${index} is an error tile`);
                assert.isFalse(map[reportCard.getCardId(index)].clickable, `sub-card ${index}`);
            });
        });

        it("without Open dashboard keeps each sub-card's flag as its query gave it", () => {
            const reportCard = card("nested", {nested: true, countOfCards: 2});
            const fresh = {nested: subResults(reportCard, [valueOnly("3"), {...valueOnly("4"), lineListFunction: () => []}])};

            const map = refresh([reportCard], {fresh});

            assert.isFalse(map[reportCard.getCardId(0)].clickable, "a value with no line list");
            assert.isTrue(map[reportCard.getCardId(1)].clickable, "a value with a line list");
        });

        it("with Open dashboard shows the error tiles for a count that does not match as not tappable", () => {
            // With auto refresh off, cached sub-results that no longer match the card's count are shown as error tiles.
            const reportCard = openDashboardCard("open", {nested: true, countOfCards: 2});
            const stale = NestedReportCardResult.create("3", null, true, false, reportCard.getCardId(0));
            stale.reportCard = reportCard.uuid;
            stale.dashboard = DASHBOARD;

            const map = refresh([reportCard], {cachedNested: [stale], autoRefreshEnabled: false});

            [0, 1].forEach((index) => {
                assert.isTrue(map[reportCard.getCardId(index)].hasErrorMsg, `sub-card ${index} is an error tile`);
                assert.isFalse(map[reportCard.getCardId(index)].clickable, `sub-card ${index}`);
            });
        });
    });
});

// With auto refresh off the dashboard shows saved counts, and the cache hands every saved count back as tappable and
// not an error. So a failed Open dashboard count is never saved, and one saved by an earlier build is counted again.
describe("CustomDashboardActions.refreshCount, which counts are saved", () => {
    const savedFor = (cacheService, cardUUID) => ({
        updates: cacheService.updates.filter((x) => x.card === cardUUID),
        batched: _.flatMap(cacheService.batches, (b) => b.single).filter((x) => x.card.uuid === cardUUID),
    });

    it("with Open dashboard and auto refresh on, a failed count is not saved", () => {
        const reportCard = openDashboardCard("open");

        const {cacheService} = runRefresh([reportCard], {fresh: {open: failedQueryTile(reportCard)}});

        const {updates, batched} = savedFor(cacheService, "open");
        assert.lengthOf(updates, 0, "no save on its own");
        assert.lengthOf(batched, 1);
        assert.isNull(batched[0].result, "the batch is told to drop the card's saved count");
    });

    it("without an action, a failed count is still saved", () => {
        const reportCard = card("plain");
        const fresh = {plain: failedQueryTile(reportCard)};

        const {cacheService} = runRefresh([reportCard], {fresh});

        const {updates, batched} = savedFor(cacheService, "plain");
        assert.strictEqual(updates[0].result, fresh.plain);
        assert.strictEqual(batched[0].result, fresh.plain);
    });

    it("with Open dashboard, a count is saved as today", () => {
        const reportCard = openDashboardCard("open");
        const fresh = {open: ReportCardResult.fromQueryResult(valueOnly())};

        const {cacheService} = runRefresh([reportCard], {fresh});

        const {updates, batched} = savedFor(cacheService, "open");
        assert.strictEqual(updates[0].result, fresh.open);
        assert.strictEqual(batched[0].result, fresh.open);
    });

    it("with Open dashboard and auto refresh off, a failure saved by an earlier build is counted again, and still has no arrow", () => {
        const reportCard = openDashboardCard("open");
        const fresh = {open: failedQueryTile(reportCard)};

        const {map, counted} = runRefresh([reportCard], {fresh, cached: [savedFailure(reportCard)], autoRefreshEnabled: false});

        assert.deepEqual(counted, ["open"]);
        const tile = map[reportCard.getCardId()];
        assert.strictEqual(tile, fresh.open);
        assert.isFalse(tile.clickable);
    });

    it("with Open dashboard and auto refresh off, a failure saved by an earlier build gives way to the count the query now gives", () => {
        const reportCard = openDashboardCard("open");
        const fresh = {open: ReportCardResult.fromQueryResult(valueOnly("12"))};

        const {map, counted} = runRefresh([reportCard], {fresh, cached: [savedFailure(reportCard)], autoRefreshEnabled: false});

        assert.deepEqual(counted, ["open"]);
        assert.equal(map[reportCard.getCardId()].primaryValue, "12");
        assert.isTrue(map[reportCard.getCardId()].clickable);
    });

    it("without an action and auto refresh off, a saved failure is shown as saved", () => {
        const reportCard = card("plain");

        const {map, counted} = runRefresh([reportCard], {cached: [savedFailure(reportCard)], autoRefreshEnabled: false});

        assert.deepEqual(counted, [], "other cards are outside this card's scope");
        assert.equal(map[reportCard.getCardId()].primaryValue, "Error");
    });

    it("with Open dashboard, a failed count is counted again on the next load with auto refresh off, and has no arrow", () => {
        const reportCard = openDashboardCard("open");
        const good = ReportCardResult.create("7", null, true);
        good.reportCard = "open";
        good.dashboard = DASHBOARD;
        const cache = new CustomDashboardCache({uuid: "cache-1", dashboard: {uuid: DASHBOARD}, reportCardResults: [good.that], nestedReportCardResults: []});
        const cacheService = realCacheServiceOver(cache);

        const first = runRefresh([reportCard], {fresh: {open: failedQueryTile(reportCard)}, cacheService});
        assert.isFalse(first.map[reportCard.getCardId()].clickable, "the failure on screen has no arrow");
        assert.isUndefined(cache.getReportCardResult(reportCard), "the good count saved before is gone, and no failure is saved");

        const second = runRefresh([reportCard], {fresh: {open: failedQueryTile(reportCard)}, cacheService, autoRefreshEnabled: false});
        assert.deepEqual(second.counted, ["open"], "counted again, not read from the saved counts");
        const tile = second.map[reportCard.getCardId()];
        assert.isTrue(tile.hasErrorMsg);
        assert.isFalse(tile.clickable);
        assert.isUndefined(cache.getReportCardResult(reportCard));
    });

    it("with Open dashboard and nested and auto refresh off, a failed card is counted fresh, has no arrow and is not saved", () => {
        const reportCard = openDashboardCard("open", {nested: true, countOfCards: 2});

        const {map, counted, cacheService} = runRefresh([reportCard], {fresh: {open: failedQueryTile(reportCard)}, autoRefreshEnabled: false});

        assert.deepEqual(counted, ["open"]);
        [0, 1].forEach((index) => assert.isFalse(map[reportCard.getCardId(index)].clickable, `sub-card ${index}`));
        assert.lengthOf(_.flatMap(cacheService.batches, (b) => b.nested), 0);
    });
});
