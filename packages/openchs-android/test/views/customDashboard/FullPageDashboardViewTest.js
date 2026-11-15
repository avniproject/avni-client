// A Full page dashboard on the dashboard screen: how it is drawn, which page each screen keeps while another holds the
// shared state, how commands and links on the page work, and when coming back recalculates the page.

import React from "react";
import _ from "lodash";
import TestRenderer, {act} from "react-test-renderer";
import {ScrollView} from "react-native";

jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));
jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/reducer", () => ({
    __esModule: true,
    default: {reducerKeys: {customDashboard: "customDashboard", syncComponentAction: "syncComponent"}},
}));
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/views/approval/ApprovalListingView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/individual/IndividualSearchResultPaginatedView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/individuallist/IndividualListView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/comment/CommentListView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/task/TaskListView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/customDashboard/CustomCardDetailView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/filter/FiltersViewV2", () => ({__esModule: true, default: Object.assign(() => null, {path: () => "/FilterViewV2"})}));
jest.mock("../../../src/views/checklist/ChecklistListingView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
// Captures the container's style, so a test can see the margin the tiles keep and a full page drops.
jest.mock("../../../src/views/common/CHSContainer", () => ({__esModule: true, default: ({children, style}) => {
    global.__containerStyle = style;
    return children;
}}));
jest.mock("react-native-webview", () => ({WebView: (props) => {
    global.__webViewProps = props;
    return null;
}}));
jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../../src/framework/errorHandling/ErrorUtil", () => ({__esModule: true, default: {notifyBugsnag: jest.fn()}}));

import CustomDashboardView, {OpenedDashboardView} from "../../../src/views/customDashboard/CustomDashboardView";
import CustomCardPage from "../../../src/views/customDashboard/CustomCardPage";
import {CardListView} from "../../../src/views/customDashboard/CardListView";
import {CardTileView} from "../../../src/views/customDashboard/CardTileView";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import {
    CustomDashboardActionMap,
    CustomDashboardActionNames as Actions,
    CustomDashboardActions
} from "../../../src/action/customDashboard/CustomDashboardActions";
import CustomDashboardService, {CustomDashboardType} from "../../../src/service/customDashboard/CustomDashboardService";
import DashboardSectionCardMappingService from "../../../src/service/customDashboard/DashboardSectionCardMappingService";
import CustomDashboardCacheService from "../../../src/service/CustomDashboardCacheService";
import ReportCardService from "../../../src/service/customDashboard/ReportCardService";
import MessageService from "../../../src/service/MessageService";
import UserInfoService from "../../../src/service/UserInfoService";
import OrganisationConfigService from "../../../src/service/OrganisationConfigService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import EntityService from "../../../src/service/EntityService";
import EntityQueueService from "../../../src/service/EntityQueueService";
import CustomCardCommandService from "../../../src/service/customDashboard/CustomCardCommandService";
import CustomCardConfigService, {clearCaches, lastFullPages, markPagesStale} from "../../../src/service/CustomCardConfigService";
import LocalCacheService from "../../../src/service/LocalCacheService";
import {ReportCard} from "openchs-models";

const home = {customDashboardType: CustomDashboardType.Primary, routePath: "/landingView", title: "home", hideBackButton: true, bottomInset: 80};
const d1 = {uuid: "d1", name: "Home page", voided: false};
const t1 = {uuid: "t1", name: "Village page", voided: false};

const card = (uuid, custom = true) => Object.assign(ReportCard.newReportCard(), {uuid, name: uuid, customCardConfig: custom ? {uuid: `cfg-${uuid}`, voided: false} : null});
const section = (uuid, dashboard, viewType = "FullPage") => ({uuid, viewType, voided: false, displayOrder: 1, dashboard: {uuid: dashboard}});
const mapping = (c, s) => ({get card() {
    return card(c.uuid, !_.isNil(c.customCardConfig));
}, dashboardSection: s, displayOrder: 1});
// d1 and t1 are full pages. `twoCards` gives d1 a second card in its section.
const mappingsFor = ({twoCards} = {}) => ({
    d1: [mapping(card("home-card"), section("s-d1", "d1")), ...(twoCards ? [mapping(card("other-card"), section("s-d1", "d1"))] : [])],
    t1: [mapping(card("village-card"), section("s-t1", "t1"))],
});

const buildPhone = ({autoRefreshEnabled = true, twoCards = false} = {}) => {
    const mappings = mappingsFor({twoCards});
    const renderPage = jest.fn((config) => ({html: `<p>${config.uuid}</p>`}));
    const reducerServices = new Map([
        [CustomDashboardService, {
            getDashboards: (type) => type === CustomDashboardType.Primary ? [d1] : [],
            findByUUID: (uuid) => _.find([d1, t1], (d) => d.uuid === uuid),
            getDashboardData: () => ({selectedFilterValues: {}, dashboardCache: {filterApplied: false, updatedAt: null}}),
        }],
        [DashboardFilterService, {areFiltersPresent: () => false, toRuleInputObjects: () => []}],
        [DashboardSectionCardMappingService, {getAllCardsForDashboard: (uuid) => mappings[uuid] || []}],
        [CustomDashboardCacheService, {
            getDashboardCache: () => ({dashboardCache: {updatedAt: null, filterApplied: false, getReportCardResult: () => null}}),
            updateReportCardResult: _.noop, batchUpdateResults: _.noop, clearResults: _.noop,
        }],
        [ReportCardService, {db: null, getReportCardCount: () => ({primaryValue: "1"})}],
        [UserInfoService, {getUserSettingsObject: () => ({autoRefreshEnabled})}],
        [MessageService, {getI18n: () => ({t: (key) => `i18n:${key}`})}],
        [CustomCardConfigService, {
            loadTemplate: () => Promise.resolve("<p/>"),
            getCachedTemplate: () => ({template: "<p/>"}),
            renderPage,
        }],
    ]);
    const reducerContext = {get: (Class) => reducerServices.get(Class)};

    let state = CustomDashboardActions.getInitialState();
    let syncState = {syncing: false, backgroundSyncInProgress: false};
    const storeListeners = new Set();
    const dispatch = jest.fn((action) => {
        if (action.type === "RESET") state = CustomDashboardActions.getInitialState();
        else if (CustomDashboardActionMap.has(action.type) && action.type !== Actions.ON_CARD_PRESS) state = CustomDashboardActionMap.get(action.type)(state, action, reducerContext);
        [...storeListeners].forEach((listener) => listener());
    });
    const store = {
        getState: () => ({customDashboard: state, syncComponent: syncState}),
        subscribe: (listener) => {
            storeListeners.add(listener);
            return () => storeListeners.delete(listener);
        },
        dispatch,
    };

    const focusListeners = new Set();
    let liveFocus = null;
    // The rows the save queue holds.
    const queue = [];
    const commandDispatch = jest.fn();
    const viewServices = new Map([
        [MessageService, {getI18n: () => ({t: (key) => `i18n:${key}`})}],
        [UserInfoService, {
            getUserSettingsObject: () => ({autoRefreshEnabled, autoRefreshDisabled: !autoRefreshEnabled}),
            getUserInfo: () => ({getDisplayUsername: () => "Asha Devi"}),
        }],
        [OrganisationConfigService, {isGuideUserToRegisterButtonOn: () => false}],
        [DashboardFilterService, {getFilters: () => [], getFilterConfigsForDashboard: () => ({})}],
        [EntityService, {findByUUID: (uuid) => ({uuid, voided: false, viewType: "FullPage", displayOrder: 1})}],
        [EntityQueueService, {findAll: () => ({filtered: (query, time) => queue.filter((row) => row.savedAt > time)})}],
        [CustomCardCommandService, {dispatch: commandDispatch}],
    ]);
    const nav = {push: jest.fn(), replace: jest.fn(), pop: jest.fn(), getCurrentRoutes: jest.fn(() => [])};
    const context = {
        getService: (Class) => {
            if (!viewServices.has(Class)) throw new Error(`unexpected service ${Class && Class.name}`);
            return viewServices.get(Class);
        },
        getStore: () => store,
        navigator: () => nav,
        subscribeSceneDidFocus: (listener) => {
            focusListeners.add(listener);
            return () => focusListeners.delete(listener);
        },
        currentRoutePath: () => "/openedDashboardView",
        focusedRoute: () => liveFocus,
    };

    const show = (ViewClass, props = {}) => {
        let renderer;
        act(() => {
            renderer = TestRenderer.create(<ServiceContext.Provider value={context}><ViewClass {...props}/></ServiceContext.Provider>);
        });
        return {
            root: renderer.root,
            instance: renderer.root.findByType(ViewClass).instance,
            pages: () => renderer.root.findAllByType(CustomCardPage),
            close: () => act(() => renderer.unmount()),
        };
    };

    return {
        show, nav, renderPage, queue, commandDispatch,
        state: () => state,
        dispatched: () => dispatch.mock.calls.map(([action]) => action),
        focus: (path, queryParams) => act(() => {
            liveFocus = {path, queryParams};
            [...focusListeners].forEach((listener) => listener(liveFocus));
        }),
        startTransition: () => {
            liveFocus = null;
        },
        setSync: (sync) => {
            syncState = {...syncState, ...sync};
        },
        // The reset at the end of a full sync empties the shared state, and the screen in front reloads.
        reset: () => act(() => store.dispatch({type: "RESET"})),
        save: (entityUUID = "e1") => queue.push({entity: "Encounter", entityUUID, savedAt: new Date(Date.now() + 1000 * (queue.length + 1))}),
    };
};

describe("A Full page dashboard", () => {
    let frames;
    const runFrames = () => act(() => {
        for (let i = 0; i < 2; i++) {
            const due = frames;
            frames = [];
            due.forEach((callback) => callback(Date.now()));
        }
    });
    const settle = async () => {
        await act(async () => {
            jest.advanceTimersByTime(500);
            for (let i = 0; i < 20; i++) await Promise.resolve();
        });
    };
    const types = (actions) => actions.map((action) => action.type);
    // Home, with its page calculated, in front.
    const homeShown = async (options) => {
        const phone = buildPhone(options);
        const screen = phone.show(CustomDashboardView, home);
        await settle();
        phone.focus("/landingView");
        return {phone, screen};
    };
    // A command from the page, as the page's script sends it after a touch.
    const sendCommand = (screen) => {
        const page = screen.pages()[0].instance;
        act(() => page.onMessage({nativeEvent: {url: "null", data: JSON.stringify({avniCommand: "editVisit", args: {}, token: page._pageToken})}}));
    };

    beforeEach(async () => {
        jest.useFakeTimers();
        frames = [];
        jest.spyOn(global, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
        clearCaches();
        await LocalCacheService.clearAllFullPageRunning();
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe("drawn", () => {
        it("as one page with no side margins, room for the bottom bar, no tiles and no section name, outside the scroll view", async () => {
            const {phone, screen} = await homeShown();
            const pages = screen.pages();
            expect(pages).toHaveLength(1);
            expect(pages[0].props.padded).toBe(false);
            expect(pages[0].props.bottomInset).toBe(80);
            expect(pages[0].props.html).toBe("<p>cfg-home-card</p>");
            // A new WebView, at the top of the page, for each dashboard.
            expect(pages[0].props.pageKey).toBe("d1");
            expect(screen.root.findAllByType(CardTileView)).toHaveLength(0);
            expect(screen.root.findAllByType(CardListView)).toHaveLength(0);
            let parent = pages[0].parent;
            while (parent) {
                expect(parent.type).not.toBe(ScrollView);
                parent = parent.parent;
            }
            expect(_.get(global.__containerStyle, "marginBottom")).toBeUndefined();
            expect(phone.renderPage).toHaveBeenCalledTimes(1);
        });

        it("with two cards, shows them as a list, as today", async () => {
            const {screen} = await homeShown({twoCards: true});
            expect(screen.pages()).toHaveLength(0);
            expect(screen.root.findAllByType(CardListView)).toHaveLength(2);
            expect(global.__containerStyle.marginBottom).toBeDefined();
        });

        it("with auto-refresh off, the refresh row shows the time the page was calculated, and takes no flex", async () => {
            const {screen} = await homeShown({autoRefreshEnabled: false});
            const row = screen.root.findAll((node) => node.props.onRefreshPressed && node.props.lastUpdatedOn);
            expect(row.length).toBeGreaterThan(0);
            expect(row[0].props.lastUpdatedOn).toBe(lastFullPages.get("d1").calculatedAt);
            let wrapper = row[0].parent;
            while (_.get(wrapper, "props.style.flexDirection") !== "row") wrapper = wrapper.parent;
            expect(wrapper.props.style.flex).toBeUndefined();
        });

        it("Home keeps its own page while an opened full page holds the state, and when it comes back", async () => {
            const {phone, screen} = await homeShown();
            const opened = phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
            await settle();
            expect(opened.pages()[0].props.html).toBe("<p>cfg-village-card</p>");
            expect(screen.pages()[0].props.html).toBe("<p>cfg-home-card</p>");
            opened.close();
            phone.focus("/landingView");
            expect(screen.pages()[0].props.html).toBe("<p>cfg-home-card</p>");
            runFrames();
            expect(screen.pages()[0].props.html).toBe("<p>cfg-home-card</p>");
        });
    });

    describe("commands from the page", () => {
        it("go to the command service with a handle whose view is the dashboard screen", async () => {
            const {phone, screen} = await homeShown();
            sendCommand(screen);
            expect(phone.commandDispatch).toHaveBeenCalledTimes(1);
            const handle = phone.commandDispatch.mock.calls[0][1];
            expect(handle.view).toBe(screen.instance);
            expect(handle.reportCard.uuid).toBe("home-card");
            expect(handle.sourceDashboardUUID).toBe("d1");
        });

        it("are dropped while the page is not in front, or while another screen holds the state", async () => {
            const {phone, screen} = await homeShown();
            phone.startTransition();
            sendCommand(screen);
            phone.focus("/customCardDetailView");
            sendCommand(screen);
            phone.focus("/landingView");
            phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
            phone.focus("/landingView");
            sendCommand(screen);
            expect(phone.commandDispatch).not.toHaveBeenCalled();
        });

        it("drop a second command until the page is in front again", async () => {
            const {phone, screen} = await homeShown();
            sendCommand(screen);
            phone.commandDispatch.mock.calls[0][1].navigate(_.noop);
            sendCommand(screen);
            expect(phone.commandDispatch).toHaveBeenCalledTimes(1);
            phone.focus("/someForm");
            phone.focus("/landingView");
            sendCommand(screen);
            expect(phone.commandDispatch).toHaveBeenCalledTimes(2);
        });

        it("a link opens the target above, with this dashboard as the one to come back to", async () => {
            const {phone, screen} = await homeShown();
            sendCommand(screen);
            expect(phone.commandDispatch.mock.calls[0][1].openDashboard("t1")).toBe(true);
            expect(phone.nav.push).toHaveBeenCalledTimes(1);
            expect(phone.nav.push.mock.calls[0][0].path).toBe(OpenedDashboardView.path());
            expect(phone.nav.push.mock.calls[0][0].queryParams).toEqual({dashboardUUID: "t1"});
            expect(screen.instance.dashboardToRestore).toBe("d1");
        });
    });

    describe("coming back after a command", () => {
        const commandOpensScreen = (phone, screen) => {
            sendCommand(screen);
            phone.commandDispatch.mock.calls[phone.commandDispatch.mock.calls.length - 1][1].navigate(_.noop);
            phone.focus("/someForm");
        };
        const forceRefreshes = (phone) => types(phone.dispatched()).filter((type) => type === Actions.FORCE_REFRESH).length;

        it("recalculates once when something was saved", async () => {
            const {phone, screen} = await homeShown();
            commandOpensScreen(phone, screen);
            phone.save();
            phone.focus("/landingView");
            runFrames();
            await settle();
            expect(forceRefreshes(phone)).toBe(1);
            expect(phone.renderPage).toHaveBeenCalledTimes(2);
            phone.focus("/landingView");
            runFrames();
            expect(forceRefreshes(phone)).toBe(1);
        });

        it("does not recalculate when nothing was saved, or only before the command", async () => {
            const {phone, screen} = await homeShown();
            commandOpensScreen(phone, screen);
            phone.focus("/landingView");
            runFrames();
            expect(forceRefreshes(phone)).toBe(0);
            phone.save();
            commandOpensScreen(phone, screen);
            // The command came after the row was saved.
            screen.instance._commandOpenedAt = new Date(Date.now() + 60000);
            phone.focus("/landingView");
            runFrames();
            expect(forceRefreshes(phone)).toBe(0);
        });

        it("recalculates after each of two saves of the same record", async () => {
            const {phone, screen} = await homeShown();
            for (const expected of [1, 2]) {
                commandOpensScreen(phone, screen);
                phone.save("e1");
                phone.focus("/landingView");
                runFrames();
                expect(forceRefreshes(phone)).toBe(expected);
            }
        });

        it("another route's focus does nothing", async () => {
            const {phone, screen} = await homeShown();
            commandOpensScreen(phone, screen);
            phone.save();
            phone.focus("/anotherScreen");
            runFrames();
            expect(forceRefreshes(phone)).toBe(0);
            expect(screen.instance._commandNavigated).toBe(true);
        });

        it("after a link, a save on the opened dashboard forces Home's reload to recalculate; with no save it does not", async () => {
            for (const saved of [true, false]) {
                const {phone, screen} = await homeShown({autoRefreshEnabled: false});
                sendCommand(screen);
                phone.commandDispatch.mock.calls[0][1].openDashboard("t1");
                // The push starts a slide, so no route is in front while the opened dashboard mounts.
                phone.startTransition();
                const opened = phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
                phone.focus("/openedDashboardView", {dashboardUUID: "t1"});
                await settle();
                if (saved) phone.save();
                opened.close();
                phone.focus("/landingView");
                runFrames();
                const onLoads = phone.dispatched().filter((action) => action.type === Actions.ON_LOAD);
                expect(!!_.last(onLoads).forceFullPage).toBe(saved);
                expect(types(phone.dispatched())).not.toContain(Actions.FORCE_REFRESH);
                const before = phone.renderPage.mock.calls.length;
                await settle();
                expect(phone.renderPage.mock.calls.length - before).toBe(saved ? 1 : 0);
                expect(screen.pages()[0].props.html).toBe("<p>cfg-home-card</p>");
                screen.close();
                clearCaches();
            }
        });
    });

    describe("a page whose rule was still running when the app was closed", () => {
        it("shows Load page and runs no rule; the button clears the mark and runs it", async () => {
            await LocalCacheService.markFullPageRunning("d1");
            const phone = buildPhone();
            const screen = phone.show(CustomDashboardView, home);
            await settle();
            expect(phone.renderPage).not.toHaveBeenCalled();
            expect(screen.pages()[0].props.held).toBe(true);
            await act(async () => {
                await screen.pages()[0].props.onLoadPage();
            });
            await settle();
            expect(phone.renderPage).toHaveBeenCalledTimes(1);
            expect(screen.pages()[0].props.held).toBe(false);
            expect(await LocalCacheService.isFullPageRunning("d1")).toBe(false);
        });
    });

    it("a changed page file recalculates the page that shows it, and only that one", async () => {
        const {phone, screen} = await homeShown({autoRefreshEnabled: false});
        act(() => screen.instance.onTemplateChange("cfg-other"));
        expect(types(phone.dispatched())).not.toContain(Actions.FORCE_REFRESH);
        act(() => screen.instance.onTemplateChange("cfg-home-card"));
        expect(types(phone.dispatched())).toContain(Actions.FORCE_REFRESH);
        await settle();
        expect(phone.renderPage).toHaveBeenCalledTimes(2);
    });

    [true, false].forEach((autoRefreshEnabled) => {
        it(`a page file changed during a sync runs the rule once, on the reload after the sync (auto-refresh ${autoRefreshEnabled ? "on" : "off"})`, async () => {
            for (const sync of [{syncing: true}, {backgroundSyncInProgress: true}]) {
                const {phone, screen} = await homeShown({autoRefreshEnabled});
                phone.setSync(sync);
                // As the service does when the download settles: mark the page stale, then tell the screen.
                markPagesStale("cfg-home-card");
                act(() => screen.instance.onTemplateChange("cfg-home-card"));
                await settle();
                expect(types(phone.dispatched())).not.toContain(Actions.FORCE_REFRESH);
                expect(phone.renderPage).toHaveBeenCalledTimes(1);

                phone.setSync({syncing: false, backgroundSyncInProgress: false});
                phone.reset();
                runFrames();
                await settle();
                expect(phone.renderPage).toHaveBeenCalledTimes(2);
                screen.close();
                clearCaches();
            }
        });
    });

    it("a page file changed while the full page was off screen recalculates it on the next open, with auto-refresh off", async () => {
        const phone = buildPhone({autoRefreshEnabled: false});
        const first = phone.show(CustomDashboardView, home);
        await settle();
        expect(phone.renderPage).toHaveBeenCalledTimes(1);
        first.close();
        markPagesStale("cfg-other");
        const second = phone.show(CustomDashboardView, home);
        await settle();
        expect(phone.renderPage).toHaveBeenCalledTimes(1);
        second.close();
        markPagesStale("cfg-home-card");
        phone.show(CustomDashboardView, home);
        await settle();
        expect(phone.renderPage).toHaveBeenCalledTimes(2);
    });
});
