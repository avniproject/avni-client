// Verifies which card numbers CustomDashboardActions.refreshCount makes tappable. A card with the Open dashboard action
// opens its dashboard whatever its query returns, so its number is tappable even when the query gives a value with no
// line list, unless the result is an error. Single and nested cards alike. Every other card keeps the tappable flag its
// result came with, and a cached result stays tappable as it is today.

import {assert} from "chai";
import {CustomDashboardCache, NestedReportCardResult, ReportCard, ReportCardResult} from "openchs-models";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomDashboardActions} from "../../../src/action/customDashboard/CustomDashboardActions";
import CustomDashboardService from "../../../src/service/customDashboard/CustomDashboardService";
import CustomDashboardCacheService from "../../../src/service/CustomDashboardCacheService";
import UserInfoService from "../../../src/service/UserInfoService";
import ReportCardService from "../../../src/service/customDashboard/ReportCardService";
import MessageService from "../../../src/service/MessageService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";

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

// Runs refreshCount over `cards`. `fresh` gives each card's freshly computed result by card uuid.
function refresh(cards, {fresh = {}, cached = [], cachedNested = [], autoRefreshEnabled = true} = {}) {
    const dashboardCache = dashboardCacheHolding(cached, cachedNested);
    const services = new Map([
        [CustomDashboardService, {getDashboardData: () => ({selectedFilterValues: {}})}],
        [CustomDashboardCacheService, {
            getDashboardCache: () => ({dashboardCache}),
            updateReportCardResult: () => {},
            batchUpdateResults: () => {},
        }],
        [UserInfoService, {getUserSettingsObject: () => ({autoRefreshEnabled})}],
        [ReportCardService, {db: null, getReportCardCount: (reportCard) => fresh[reportCard.uuid]}],
        [MessageService, {getI18n: () => ({t: (key) => key})}],
        [DashboardFilterService, {toRuleInputObjects: () => []}],
    ]);
    const state = {
        ...CustomDashboardActions.getInitialState(),
        dashboards: [{uuid: DASHBOARD}],
        activeDashboardUUID: DASHBOARD,
        reportCardSectionMappings: cards.map((reportCard) => ({card: reportCard})),
    };
    return CustomDashboardActions.refreshCount(state, {}, {get: (Class) => services.get(Class)}).cardToCountResultMap;
}

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
