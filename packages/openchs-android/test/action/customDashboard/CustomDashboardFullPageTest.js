// A Full page dashboard: which dashboards count as one, how refreshCount builds or reuses the page, the state each
// screen keeps per dashboard, and the mark that holds a page whose rule was still running when the app was closed.

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import _ from "lodash";
import {DashboardSection, ReportCard} from "openchs-models";
import {
    CustomDashboardActionMap,
    CustomDashboardActionNames as Actions,
    CustomDashboardActions,
    fullPageCard,
    performCustomDashboardActionAndRefresh
} from "../../../src/action/customDashboard/CustomDashboardActions";
import CustomDashboardService from "../../../src/service/customDashboard/CustomDashboardService";
import CustomDashboardCacheService from "../../../src/service/CustomDashboardCacheService";
import UserInfoService from "../../../src/service/UserInfoService";
import ReportCardService from "../../../src/service/customDashboard/ReportCardService";
import MessageService from "../../../src/service/MessageService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import DashboardSectionCardMappingService from "../../../src/service/customDashboard/DashboardSectionCardMappingService";
import CustomCardConfigService, {lastFullPages} from "../../../src/service/CustomCardConfigService";
import LocalCacheService from "../../../src/service/LocalCacheService";
import General from "../../../src/utility/General";

const D1 = "d1";
const config = {uuid: "cfg", voided: false};

// A card read from a mapping, as the phone reads it: a new object on every read.
const cardFields = (uuid, {custom = true, customConfig = config} = {}) => ({uuid, name: uuid, customCardConfig: custom ? customConfig : null});
const newCard = (fields) => Object.assign(ReportCard.newReportCard(), fields);
const section = (uuid, viewType, {voided = false, dashboard = D1} = {}) => ({uuid, viewType, voided, dashboard: {uuid: dashboard}});
const mapping = (fields, dashboardSection) => ({
    get card() {
        return newCard(fields);
    },
    dashboardSection,
});
const stateWith = (mappings, extra = {}) => ({
    ...CustomDashboardActions.getInitialState(),
    dashboards: [{uuid: D1}],
    activeDashboardUUID: D1,
    reportCardSectionMappings: mappings,
    ...extra,
});
const validMappings = () => [mapping(cardFields("pc"), section("s1", "FullPage"))];

describe("fullPageCard", () => {
    it("gives the card of a dashboard with one Full page section holding one Custom Design Card", () => {
        expect(fullPageCard(stateWith(validMappings())).uuid).toBe("pc");
    });

    // The app ships before, or without, a models release that names the view type.
    it("works with a models library that does not name the Full page view type", () => {
        const names = DashboardSection.viewTypeName;
        const had = Object.prototype.hasOwnProperty.call(names, "FullPage");
        const kept = names.FullPage;
        delete names.FullPage;
        try {
            expect(fullPageCard(stateWith(validMappings())).uuid).toBe("pc");
        } finally {
            if (had) names.FullPage = kept;
        }
    });

    it("gives none for two cards, a data card, a Tile section, or two sections", () => {
        const s1 = section("s1", "FullPage");
        [
            [mapping(cardFields("a"), s1), mapping(cardFields("b"), s1)],
            [mapping(cardFields("a", {custom: false}), s1)],
            [mapping(cardFields("a"), section("s1", "Tile"))],
            [mapping(cardFields("a"), s1), mapping(cardFields("b"), section("s2", "FullPage"))],
        ].forEach((mappings) => expect(fullPageCard(stateWith(mappings))).toBeNull());
    });

    it("leaves out a voided section and another dashboard's mappings", () => {
        expect(fullPageCard(stateWith([...validMappings(), mapping(cardFields("b"), section("s2", "Tile", {voided: true}))])).uuid).toBe("pc");
        expect(fullPageCard(stateWith([...validMappings(), mapping(cardFields("b"), section("s3", "Tile", {dashboard: "d2"}))])).uuid).toBe("pc");
    });

    it("gives none for a voided design, or a mapping without a section", () => {
        expect(fullPageCard(stateWith([mapping(cardFields("a", {customConfig: {uuid: "cfg", voided: true}}), section("s1", "FullPage"))]))).toBeNull();
        expect(fullPageCard(stateWith([{card: newCard(cardFields("a"))}]))).toBeNull();
    });
});

// Runs an action through the real reducer with stubbed services.
const harness = ({autoRefreshEnabled = true, template = {template: "<p>${data.n}</p>"}, filters = {}, order = [], tileCount} = {}) => {
    const renderPage = jest.fn((cfg, input, tpl) => {
        order.push("render");
        return {html: tpl.replace("${data.n}", "1")};
    });
    const loadTemplate = jest.fn(() => Promise.resolve("<p/>"));
    const getReportCardCount = jest.fn(tileCount || (() => ({primaryValue: "1"})));
    let selectedFilterValues = filters;
    const services = new Map([
        [CustomDashboardService, {
            getDashboardData: () => ({selectedFilterValues, dashboardCache: {filterApplied: false}}),
            getDashboards: () => [{uuid: D1}],
        }],
        [CustomDashboardCacheService, {
            getDashboardCache: () => ({dashboardCache: {updatedAt: new Date(2020, 0, 1), filterApplied: false, getReportCardResult: () => null}}),
            updateReportCardResult: () => {},
            batchUpdateResults: () => {},
            clearResults: () => {},
        }],
        [UserInfoService, {getUserSettingsObject: () => ({autoRefreshEnabled})}],
        [ReportCardService, {
            db: {isSqlite: true, beginQueryCache: () => order.push("begin"), endQueryCache: () => order.push("end")},
            getReportCardCount,
        }],
        [MessageService, {getI18n: () => ({t: (key) => `i18n:${key}`})}],
        [DashboardFilterService, {toRuleInputObjects: () => [], areFiltersPresent: () => false}],
        [DashboardSectionCardMappingService, {getAllCardsForDashboard: () => validMappings()}],
        [CustomCardConfigService, {renderPage, loadTemplate, getCachedTemplate: () => template}],
    ]);
    const context = {get: (Class) => services.get(Class)};
    const run = (name, state, action = {}) => CustomDashboardActionMap.get(name)(state, action, context);
    return {run, renderPage, loadTemplate, getReportCardCount, order, setFilters: (f) => selectedFilterValues = f};
};

describe("refreshCount on a full page", () => {
    beforeEach(() => lastFullPages.clear());

    it("runs the rule once, inside the query cache, and no tile count for the card", () => {
        const h = harness();
        const state = h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(h.renderPage).toHaveBeenCalledTimes(1);
        expect(h.order).toEqual(["begin", "render", "end"]);
        expect(h.getReportCardCount).not.toHaveBeenCalled();
        expect(state.fullPage[D1]).toEqual({html: "<p>1</p>", error: null, held: false, updating: false});
        expect(state.cardToCountResultMap).toEqual({});
        expect(state.resultUpdatedAt).toBeInstanceOf(Date);
        expect(state.resultUpdatedAt).toEqual(lastFullPages.get(D1).calculatedAt);
    });

    it("runs the rule once when a deleted section still links the same card", () => {
        // App Designer voids a deleted section and keeps its card links, and the phone reads those links too.
        const h = harness();
        h.run(Actions.REFRESH_COUNT, stateWith([mapping(cardFields("pc"), section("s0", "Tile", {voided: true})), ...validMappings()]));
        expect(h.renderPage).toHaveBeenCalledTimes(1);
        expect(h.getReportCardCount).not.toHaveBeenCalled();
    });

    it("does not change the earlier state's page object", () => {
        const h = harness();
        const before = stateWith(validMappings(), {fullPage: {[D1]: {html: "<p>0</p>", updating: true}}});
        const fullPage = before.fullPage;
        h.run(Actions.REFRESH_COUNT, before);
        expect(fullPage[D1]).toEqual({html: "<p>0</p>", updating: true});
    });

    it("with auto-refresh off and the same filters, shows the last page with its own time and runs no rule", () => {
        const h = harness({autoRefreshEnabled: false});
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        const {calculatedAt} = lastFullPages.get(D1);
        const state = h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(h.renderPage).toHaveBeenCalledTimes(1);
        expect(state.fullPage[D1].html).toBe("<p>1</p>");
        expect(state.resultUpdatedAt).toBe(calculatedAt);
    });

    it("with auto-refresh off, runs the rule for changed filters and for a forced refresh", () => {
        const h = harness({autoRefreshEnabled: false, filters: {f: "a"}});
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        h.setFilters({f: "b"});
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(h.renderPage).toHaveBeenCalledTimes(2);
        const forced = h.run(Actions.REFRESH_COUNT, stateWith(validMappings(), {fullPageForced: true}));
        expect(h.renderPage).toHaveBeenCalledTimes(3);
        expect(forced.fullPageForced).toBe(false);
    });

    it("with auto-refresh off, shows the last page again for filter values that refer back to themselves", () => {
        // As an Address filter holds live locations: a village whose mappings point back at it, and whose own JSON
        // must not be built.
        const village = (uuid) => {
            const level = {uuid, name: uuid, toJSON: () => {
                throw new Error("a location's JSON was built");
            }};
            level.locationMappings = [{child: level, parent: {uuid: "district"}}];
            return level;
        };
        const loop = {name: "loop"};
        loop.self = loop;
        const filters = () => ({location: {levels: [village("v1")], when: new Date(2026, 10, 14)}, other: loop});
        const h = harness({autoRefreshEnabled: false, filters: filters()});
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        h.setFilters(filters());
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(h.renderPage).toHaveBeenCalledTimes(1);
        h.setFilters({...filters(), location: {levels: [village("v2")], when: new Date(2026, 10, 14)}});
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(h.renderPage).toHaveBeenCalledTimes(2);
    });

    it("with auto-refresh on, runs the rule every time", () => {
        const h = harness();
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(h.renderPage).toHaveBeenCalledTimes(2);
    });

    it("shows the rule's error in the page area, and keeps no page to show again", () => {
        const h = harness({autoRefreshEnabled: false});
        h.renderPage.mockImplementation(() => ({error: "rule failed"}));
        const state = h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(state.fullPage[D1]).toEqual({html: null, error: "rule failed", held: false, updating: false});
        expect(lastFullPages.has(D1)).toBe(false);
        expect(state.resultUpdatedAt).toBeInstanceOf(Date);
    });

    it("a page file that could not download shows the translated message, with no rule run", () => {
        const h = harness({template: {error: new Error("offline")}});
        const state = h.run(Actions.REFRESH_COUNT, stateWith(validMappings()));
        expect(h.renderPage).not.toHaveBeenCalled();
        expect(state.fullPage[D1].error).toBe("i18n:customCardPageNotDownloaded");
    });

    it("with no page file read yet, reads it, leaves the page as it is and asks to refresh again for this dashboard", async () => {
        const h = harness({template: null});
        const refreshAgain = jest.fn();
        const before = stateWith(validMappings(), {fullPage: {[D1]: {html: "<p>0</p>", updating: true}}, fullPageForced: true});
        const state = h.run(Actions.REFRESH_COUNT, before, {refreshAgain});
        expect(h.renderPage).not.toHaveBeenCalled();
        expect(h.loadTemplate.mock.calls[0][0].uuid).toBe("cfg");
        expect(state.fullPage[D1]).toEqual({html: "<p>0</p>", updating: true});
        expect(state.fullPageForced).toBe(true);
        await Promise.resolve();
        await Promise.resolve();
        expect(refreshAgain).toHaveBeenCalledWith(D1);
    });

    it("ends the query cache when a card throws", () => {
        const order = [];
        const h = harness({order, tileCount: () => {
            throw new Error("boom");
        }});
        const tile = [mapping(cardFields("t", {custom: false}), section("s1", "Tile"))];
        expect(() => h.run(Actions.REFRESH_COUNT, stateWith(tile))).toThrow("boom");
        expect(order).toEqual(["begin", "end"]);
    });
});

describe("the full page's state per dashboard", () => {
    beforeEach(() => lastFullPages.clear());

    it("a load marks the page as updating, keeping the last page of this session, and starts reading the file", () => {
        const h = harness();
        lastFullPages.set(D1, {html: "<p>last</p>", filterKey: "{}", calculatedAt: new Date()});
        const state = h.run(Actions.ON_LOAD, CustomDashboardActions.getInitialState(), {});
        expect(state.fullPage[D1]).toEqual({html: "<p>last</p>", error: null, held: false, updating: true});
        expect(h.loadTemplate).toHaveBeenCalled();
    });

    it("a first load shows a loading mark", () => {
        const state = harness().run(Actions.ON_LOAD, CustomDashboardActions.getInitialState(), {});
        expect(state.fullPage[D1]).toEqual({html: null, error: null, held: false, updating: true});
    });

    it("with auto-refresh off and a page to show again, shows it with no Updating mark", () => {
        lastFullPages.set(D1, {html: "<p>last</p>", filterKey: "{}", calculatedAt: new Date()});
        const state = harness({autoRefreshEnabled: false}).run(Actions.ON_LOAD, CustomDashboardActions.getInitialState(), {});
        expect(state.fullPage[D1].updating).toBe(false);
    });

    it("a tab change and a cleared count mark it too", () => {
        const h = harness();
        [Actions.ON_DASHBOARD_CHANGE, Actions.CLEAR_COUNTS].forEach((name) => {
            const state = h.run(name, stateWith(validMappings()), {dashboardUUID: D1});
            expect(state.fullPage[D1].updating).toBe(true);
        });
    });

    it("a refresh, a filter applied or cleared, and a load after a save force the next calculation", () => {
        const h = harness();
        [Actions.FORCE_REFRESH, Actions.FILTER_APPLIED, Actions.FILTER_CLEARED].forEach((name) =>
            expect(h.run(name, stateWith(validMappings())).fullPageForced).toBe(true));
        expect(h.run(Actions.ON_LOAD, CustomDashboardActions.getInitialState(), {forceFullPage: true}).fullPageForced).toBe(true);
        expect(h.run(Actions.ON_LOAD, stateWith(validMappings(), {fullPageForced: true}), {}).fullPageForced).toBe(false);
    });

    it("a refresh forced on another tab does not force this tab's page", () => {
        lastFullPages.set(D1, {html: "<p>last</p>", filterKey: "{}", calculatedAt: new Date()});
        const state = harness({autoRefreshEnabled: false}).run(Actions.ON_DASHBOARD_CHANGE, stateWith(validMappings(), {activeDashboardUUID: "tiles", fullPageForced: true}), {dashboardUUID: D1});
        expect(state.fullPageForced).toBe(false);
        expect(state.fullPage[D1]).toEqual({html: "<p>last</p>", error: null, held: false, updating: false});
    });

    it("a page held after an unfinished run shows the Load page button, only for the active dashboard", () => {
        const h = harness();
        const held = h.run(Actions.FULL_PAGE_HELD, stateWith(validMappings(), {fullPage: {[D1]: {html: "<p/>", updating: true}}}), {dashboardUUID: D1});
        expect(held.fullPage[D1]).toEqual({html: "<p/>", held: true, updating: false});
        const other = stateWith(validMappings());
        expect(h.run(Actions.FULL_PAGE_HELD, other, {dashboardUUID: "d2"})).toBe(other);
    });

    it("a refresh that threw ends the Updating mark with an error", () => {
        const h = harness();
        const failed = h.run(Actions.FULL_PAGE_FAILED, stateWith(validMappings(), {fullPage: {[D1]: {html: "<p/>", updating: true}}}), {error: "boom"});
        expect(failed.fullPage[D1]).toEqual({html: null, error: "boom", updating: false});
    });
});

describe("the scheduled refresh of a full page", () => {
    const flush = async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
    };
    const dispatcherOver = (state, {autoRefreshEnabled = true, onRefresh = _.noop} = {}) => {
        const dispatched = [];
        const dispatcher = {
            state,
            sharedDashboardState: () => dispatcher.state,
            getService: () => ({getUserSettingsObject: () => ({autoRefreshEnabled})}),
            dispatchAction: jest.fn((name, payload) => {
                dispatched.push({name, payload});
                if (name === Actions.REFRESH_COUNT) onRefresh(payload);
            }),
        };
        return {dispatcher, dispatched, names: () => dispatched.map((d) => d.name)};
    };

    beforeEach(async () => {
        jest.useFakeTimers();
        lastFullPages.clear();
        await LocalCacheService.clearAllFullPageRunning();
        jest.spyOn(General, "logError").mockImplementation(() => {});
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    const fire = async () => {
        jest.advanceTimersByTime(500);
        await flush();
    };

    it("marks the run before the rule and clears the mark after it", async () => {
        let markedDuringRun;
        const {dispatcher, names} = dispatcherOver(stateWith(validMappings()), {onRefresh: () => {
            markedDuringRun = LocalCacheService.isFullPageRunning(D1);
        }});
        performCustomDashboardActionAndRefresh(dispatcher, "X");
        await fire();
        expect(names()).toEqual(["X", Actions.REFRESH_COUNT]);
        expect(await markedDuringRun).toBe(true);
        expect(await LocalCacheService.isFullPageRunning(D1)).toBe(false);
    });

    it("a mark left from a run the app did not finish holds the page, and runs no rule", async () => {
        await LocalCacheService.markFullPageRunning(D1);
        const {dispatcher, dispatched, names} = dispatcherOver(stateWith(validMappings()));
        performCustomDashboardActionAndRefresh(dispatcher, "X");
        await fire();
        expect(names()).toEqual(["X", Actions.FULL_PAGE_HELD]);
        expect(dispatched[1].payload).toEqual({dashboardUUID: D1});
        expect(await LocalCacheService.isFullPageRunning(D1)).toBe(true);
    });

    it("a refresh that throws still clears the mark, and ends the Updating mark", async () => {
        const {dispatcher, names} = dispatcherOver(stateWith(validMappings()), {onRefresh: () => {
            throw new Error("boom");
        }});
        performCustomDashboardActionAndRefresh(dispatcher, "X");
        await fire();
        expect(names()).toEqual(["X", Actions.REFRESH_COUNT, Actions.FULL_PAGE_FAILED]);
        expect(await LocalCacheService.isFullPageRunning(D1)).toBe(false);
    });

    it("no mark when the last page is shown again without a run, nor for a dashboard of tiles", async () => {
        const setItem = jest.spyOn(require("@react-native-async-storage/async-storage"), "setItem");
        setItem.mockClear();
        lastFullPages.set(D1, {html: "<p/>", filterKey: "[]", calculatedAt: new Date()});
        const reuse = dispatcherOver(stateWith(validMappings(), {customDashboardFilters: []}), {autoRefreshEnabled: false});
        performCustomDashboardActionAndRefresh(reuse.dispatcher, "X");
        await fire();
        const tiles = dispatcherOver(stateWith([mapping(cardFields("t", {custom: false}), section("s1", "Tile"))]));
        performCustomDashboardActionAndRefresh(tiles.dispatcher, "X");
        await fire();
        expect(setItem).not.toHaveBeenCalled();
        expect(reuse.names()).toEqual(["X", Actions.REFRESH_COUNT]);
    });

    it("a schedule during an awaited dispatch does not run until it ends, and does not hold the page", async () => {
        const realMark = LocalCacheService.markFullPageRunning.bind(LocalCacheService);
        let releaseMark;
        jest.spyOn(LocalCacheService, "markFullPageRunning").mockImplementationOnce((uuid) => new Promise((resolve) => {
            releaseMark = () => realMark(uuid).then(resolve);
        }));
        const {dispatcher, names} = dispatcherOver(stateWith(validMappings()));
        performCustomDashboardActionAndRefresh(dispatcher, "X");
        await fire();
        performCustomDashboardActionAndRefresh(dispatcher, "Y");
        await fire();
        expect(names()).toEqual(["X", "Y"]);
        releaseMark();
        await flush();
        await flush();
        expect(names()).toEqual(["X", "Y", Actions.REFRESH_COUNT, Actions.REFRESH_COUNT]);
        expect(await LocalCacheService.isFullPageRunning(D1)).toBe(false);
    });

    it("refreshes again only while the dashboard asked for is still the active one", async () => {
        let refreshAgain;
        const {dispatcher, names} = dispatcherOver(stateWith(validMappings()), {onRefresh: (payload) => {
            refreshAgain = payload.refreshAgain;
        }});
        performCustomDashboardActionAndRefresh(dispatcher, "X");
        await fire();
        dispatcher.state = {...dispatcher.state, activeDashboardUUID: "d2"};
        refreshAgain(D1);
        await fire();
        expect(names()).toEqual(["X", Actions.REFRESH_COUNT]);
        dispatcher.state = {...dispatcher.state, activeDashboardUUID: D1};
        refreshAgain(D1);
        await fire();
        expect(names()).toEqual(["X", Actions.REFRESH_COUNT, Actions.REFRESH_COUNT]);
    });
});
