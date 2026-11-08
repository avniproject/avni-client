// Every dashboard screen shares one piece of dashboard state. A tile opens another dashboard on its own screen, and that
// screen takes the state over. Meanwhile the screen underneath (Home, the second bottom tab, or Menu → Dashboards) keeps
// showing its own dashboard. When the user comes back to it, it loads its own dashboard again, on the tab they left,
// and points the filter screen's state back at itself.
// Covers the scene focus subscription, which store states a screen takes, and the reload after its own route focuses.

import React from "react";
import _ from "lodash";
import TestRenderer, {act} from "react-test-renderer";
import {Text, TouchableOpacity} from "react-native";

// The same stand-ins as OpenedDashboardViewTest. The global setup stubs Analytics as undefined, which the
// AbstractComponent constructor calls into.
jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));

// Importing the dashboard screen drags in every service and every screen a card can open, with their native
// modules. These tests need all of them to exist and none of them to work.
jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/reducer", () => ({
    __esModule: true,
    default: {reducerKeys: {customDashboard: "customDashboard"}},
}));
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/views/approval/ApprovalListingView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/individual/IndividualSearchResultPaginatedView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/individuallist/IndividualListView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/comment/CommentListView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/task/TaskListView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/customDashboard/CustomCardDetailView", () => ({__esModule: true, default: () => null}));
// The Filter screen needs the static path the router asks for, as the real screen's @Path gives it.
jest.mock("../../../src/views/filter/FiltersViewV2", () => ({__esModule: true, default: Object.assign(() => null, {path: () => "/FilterViewV2"})}));
jest.mock("../../../src/views/checklist/ChecklistListingView", () => ({__esModule: true, default: () => null}));
// The header is read through its props, and the container only has to pass its children on.
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/common/CHSContainer", () => ({__esModule: true, default: ({children}) => children}));

import CustomDashboardView, {OpenedDashboardView} from "../../../src/views/customDashboard/CustomDashboardView";
import AppliedFiltersV2 from "../../../src/views/filter/AppliedFiltersV2";
import CustomDashboardTab from "../../../src/views/customDashboard/CustomDashboardTab";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import {
    CustomDashboardActionMap,
    CustomDashboardActionNames as Actions,
    CustomDashboardActions
} from "../../../src/action/customDashboard/CustomDashboardActions";
import {FilterActionNames} from "../../../src/action/mydashboard/FiltersActionsV2";
import CustomDashboardService, {CustomDashboardType} from "../../../src/service/customDashboard/CustomDashboardService";
import DashboardSectionCardMappingService from "../../../src/service/customDashboard/DashboardSectionCardMappingService";
import MessageService from "../../../src/service/MessageService";
import UserInfoService from "../../../src/service/UserInfoService";
import OrganisationConfigService from "../../../src/service/OrganisationConfigService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import EntityService from "../../../src/service/EntityService";

const d1 = {uuid: "d1", name: "Supervisor view", voided: false};
const d2 = {uuid: "d2", name: "Monthly review", voided: false};
const d3 = {uuid: "d3", name: "Field visits", voided: false};
const t1 = {uuid: "t1", name: "Village detail", voided: false};

// These actions go through the real dashboard reducer, as they decide whose state the store holds and which tab is
// active. Every other action, such as the card press or the filter screen's load, is recorded and changes nothing.
const reducedActions = [Actions.ON_LOAD, Actions.ON_DASHBOARD_CHANGE, Actions.CLEAR_COUNTS, Actions.LOAD_INDICATOR];

// The phone as these tests need it: a store that runs the dashboard reducer and tells its subscribers of every
// dispatch, screens that can be mounted on top of one another, and a router whose scene focus the test reports.
// `dashboardsOfType` can be changed after mount, as a sync can change which dashboards a user has.
// With `tileOpens`, a card press opens that dashboard, as the reducer's Open dashboard branch does for a visible target.
// With `asOnDate`, every dashboard has an As On Date filter, so the screen draws the quick date buttons.
// With `autoRefreshOff`, the user has turned auto refresh off, and the store stamps the time of the count refresh as its
// reducer does, so the screen draws the refresh row once that refresh has run.
const buildPhone = (dashboardsOfType, {tileOpens, asOnDate, autoRefreshOff} = {}) => {
    const dashboards = [d1, d2, d3, t1];
    const reducerServices = new Map([
        [CustomDashboardService, {
            // As the real service does, a missing type gives the None list.
            getDashboards: (type) => dashboardsOfType[_.defaultTo(type, CustomDashboardType.None)] || [],
            findByUUID: (uuid) => _.find(dashboards, (dashboard) => dashboard.uuid === uuid),
            getDashboardData: () => ({selectedFilterValues: {}, dashboardCache: {filterApplied: false}}),
        }],
        [DashboardFilterService, {areFiltersPresent: () => !!asOnDate}],
        [DashboardSectionCardMappingService, {getAllCardsForDashboard: () => []}],
    ]);
    const reducerContext = {get: (Class) => reducerServices.get(Class)};

    let state = CustomDashboardActions.getInitialState();
    const storeListeners = new Set();
    const dispatch = jest.fn((action) => {
        if (action.type === "RESET") state = CustomDashboardActions.getInitialState();
        else if (_.includes(reducedActions, action.type)) state = CustomDashboardActionMap.get(action.type)(state, action, reducerContext);
        else if (action.type === Actions.REFRESH_COUNT && autoRefreshOff) state = {...state, resultUpdatedAt: new Date(2026, 10, 8, 10, 30)};
        else if (action.type === Actions.ON_CARD_PRESS && tileOpens) setTimeout(() => action.onOpenDashboard(tileOpens), 0);
        [...storeListeners].forEach((listener) => listener());
    });
    const store = {
        getState: () => ({customDashboard: state}),
        subscribe: (listener) => {
            storeListeners.add(listener);
            return () => storeListeners.delete(listener);
        },
        dispatch,
    };

    const focusListeners = new Set();
    const subscribeSceneDidFocus = jest.fn((listener) => {
        focusListeners.add(listener);
        return jest.fn(() => focusListeners.delete(listener));
    });
    // The route in front, as the Router's focusedRoute gives it: set when a scene focuses, null while a transition runs.
    let liveFocus = null;

    const i18n = {t: (key) => `i18n:${key}`};
    const viewServices = new Map([
        [MessageService, {getI18n: () => i18n}],
        [UserInfoService, {
            getUserSettingsObject: () => autoRefreshOff ? {autoRefreshDisabled: true} : {},
            getUserInfo: () => ({getDisplayUsername: () => "Asha Devi"}),
        }],
        [OrganisationConfigService, {isGuideUserToRegisterButtonOn: () => false}],
        [DashboardFilterService, {
            getFilters: () => asOnDate ? [{uuid: "date-filter"}] : [],
            getFilterConfigsForDashboard: () => asOnDate ? {"date-filter": {isAsOnDateFilter: () => true}} : {},
        }],
        [EntityService, {findByUUID: () => undefined}],
    ]);
    const nav = {push: jest.fn(), replace: jest.fn(), pop: jest.fn(), getCurrentRoutes: jest.fn(() => [])};
    const context = {
        getService: (Class) => {
            if (!viewServices.has(Class)) throw new Error(`unexpected service ${Class && Class.name}`);
            return viewServices.get(Class);
        },
        getStore: () => store,
        navigator: () => nav,
        subscribeSceneDidFocus,
        // Stale on purpose, as the router's path is while Home mounts during a pop. A screen must not go by it.
        currentRoutePath: () => "/openedDashboardView",
        focusedRoute: () => liveFocus,
    };

    const show = (ViewClass, props = {}) => {
        let renderer;
        act(() => {
            renderer = TestRenderer.create(
                <ServiceContext.Provider value={context}>
                    <ViewClass {...props}/>
                </ServiceContext.Provider>,
            );
        });
        return {
            root: renderer.root,
            instance: renderer.root.findByType(ViewClass).instance,
            tabs: () => renderer.root.findAllByType(CustomDashboardTab).map((tab) => tab.props.dashboard.uuid),
            close: () => act(() => renderer.unmount()),
        };
    };

    return {
        show,
        nav,
        dispatch,
        subscribeSceneDidFocus,
        state: () => state,
        dispatched: () => dispatch.mock.calls.map(([action]) => action),
        // A store change from outside the screens, such as a full sync's reset.
        dispatchFromOutside: (action) => act(() => store.dispatch(action)),
        // The router's signal that a scene has finished its transition, as Router.didFocus sends it. The scene is then
        // the one in front.
        focus: (path) => act(() => {
            liveFocus = {path};
            [...focusListeners].forEach((listener) => listener(liveFocus));
        }),
        // A transition has started, as Router.willFocus marks it. No scene is in front until the next focus.
        startTransition: () => {
            liveFocus = null;
        },
    };
};

// Opens a dashboard on top, as a tile does, and goes back from it. The opened screen's own load takes the state over,
// and the user stays long enough for its counts to load, so no refresh of its own is still waiting.
const openAndGoBack = (phone, dashboardUUID = "t1") => {
    const opened = phone.show(OpenedDashboardView, {dashboardUUID});
    act(() => {
        jest.advanceTimersByTime(500);
    });
    opened.close();
};

// The screens a tile can be tapped on. LandingView draws Home and the second tab, so it passes them its own route.
// Menu → Dashboards is pushed with no props but the router's `params`, so it goes by its own path.
const home = {customDashboardType: CustomDashboardType.Primary, routePath: "/landingView", title: "home", hideBackButton: true};
const secondTab = {customDashboardType: CustomDashboardType.Secondary, routePath: "/landingView", title: "home", hideBackButton: true};
const menuDashboards = {params: {}};
const screensUnderneath = [
    ["Home", home, "/landingView", CustomDashboardType.Primary, "Primary|"],
    ["the second tab", secondTab, "/landingView", CustomDashboardType.Secondary, "Secondary|"],
    ["Menu → Dashboards", menuDashboards, "/customDashboardView", undefined, "None|"],
];

describe("The dashboard underneath an opened dashboard", () => {
    let frames;
    let requestAnimationFrame;

    // Runs the callbacks waiting for the next frame. A callback asked for during a frame waits for the frame after.
    const nextFrame = () => act(() => {
        const due = frames;
        frames = [];
        due.forEach((callback) => callback(Date.now()));
    });
    const types = (actions) => actions.map((action) => action.type);
    // A tile press, then its zero-delay steps: the card press, then the open the reducer schedules from inside it. Fake
    // timers give a timer set while another runs a delay of 1 ms, so 1 ms runs both and none of the 500 ms refreshes.
    const press = (screen) => {
        act(() => screen.instance.onCardPress("card-1"));
        act(() => {
            jest.advanceTimersByTime(1);
        });
    };

    beforeEach(() => {
        jest.useFakeTimers();
        frames = [];
        requestAnimationFrame = jest.spyOn(global, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
    });

    afterEach(() => {
        requestAnimationFrame.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe("listening for its route to come back", () => {
        it("subscribes to scene focus once when it mounts, and unsubscribes when it unmounts", () => {
            const phone = buildPhone({Primary: [d1]});
            const screen = phone.show(CustomDashboardView, home);
            expect(phone.subscribeSceneDidFocus).toHaveBeenCalledTimes(1);
            expect(phone.subscribeSceneDidFocus).toHaveBeenCalledWith(expect.any(Function));
            const unsubscribe = phone.subscribeSceneDidFocus.mock.results[0].value;
            expect(unsubscribe).not.toHaveBeenCalled();

            screen.close();

            expect(unsubscribe).toHaveBeenCalledTimes(1);
            expect(phone.subscribeSceneDidFocus).toHaveBeenCalledTimes(1);
        });
    });

    describe("which dashboard state it shows", () => {
        it.each(screensUnderneath)("%s keeps its own dashboard while an opened dashboard owns the state", (name, props, path, type, ownKey) => {
            const phone = buildPhone({[_.defaultTo(type, CustomDashboardType.None)]: [d1, d2]});
            const screen = phone.show(CustomDashboardView, props);
            const tabsBefore = screen.tabs();

            phone.show(OpenedDashboardView, {dashboardUUID: "t1"});

            expect(phone.state().ownerKey).toBe("None|t1");
            expect(screen.instance.state.ownerKey).toBe(ownKey);
            expect(screen.instance.state.dashboards).toEqual([d1, d2]);
            expect(screen.instance.state.activeDashboardUUID).toBe("d1");
            expect(screen.tabs()).toEqual(tabsBefore);
        });

        it("takes the state again once it is its own", () => {
            const phone = buildPhone({Primary: [d1, d2]});
            const screen = phone.show(CustomDashboardView, home);
            phone.show(OpenedDashboardView, {dashboardUUID: "t1"});

            phone.dispatchFromOutside({type: Actions.ON_LOAD, customDashboardType: CustomDashboardType.Primary, activeDashboardUUID: "d2"});

            expect(screen.instance.state.ownerKey).toBe("Primary|");
            expect(screen.instance.state.activeDashboardUUID).toBe("d2");
        });

        it("takes every change to its own state, as before, when nothing is opened on top", () => {
            const phone = buildPhone({Primary: [d1]});
            const screen = phone.show(CustomDashboardView, home);

            phone.dispatchFromOutside({type: Actions.LOAD_INDICATOR, loading: true});

            expect(screen.instance.state.loading).toBe(true);
        });

        it("takes a state nobody owns, as a full sync's reset leaves it", () => {
            const phone = buildPhone({Primary: [d1]});
            const screen = phone.show(CustomDashboardView, home);

            phone.dispatchFromOutside({type: "RESET"});

            expect(screen.instance.state.ownerKey).toBeNull();
            expect(screen.instance.state.activeDashboardUUID).toBeNull();
        });
    });

    describe("when its own route comes back into focus after an opened dashboard", () => {
        // Each screen gets two dashboards here so the remembered tab can be told from the first. On a phone only
        // Menu → Dashboards has more than one: Home and the second tab each show one dashboard.
        it.each(screensUnderneath)("%s waits two frames, then loads its own dashboard on the tab it remembered, then points the filters at it", (name, props, path, type, ownKey) => {
            const phone = buildPhone({[_.defaultTo(type, CustomDashboardType.None)]: [d1, d2]});
            const screen = phone.show(CustomDashboardView, props);
            screen.instance.dashboardToRestore = "d2";
            openAndGoBack(phone);
            phone.dispatch.mockClear();

            phone.focus(path);
            expect(phone.dispatched()).toEqual([]);
            nextFrame();
            expect(phone.dispatched()).toEqual([]);
            nextFrame();

            expect(types(phone.dispatched())).toEqual([Actions.ON_LOAD, Actions.CLEAR_COUNTS, FilterActionNames.ON_LOAD]);
            expect(phone.dispatched()[0]).toEqual({type: Actions.ON_LOAD, customDashboardType: type, dashboardUUID: undefined, activeDashboardUUID: "d2"});
            expect(phone.dispatched()[2]).toEqual({type: FilterActionNames.ON_LOAD, dashboardUUID: "d2"});
            expect(screen.instance.state.ownerKey).toBe(ownKey);
            expect(screen.instance.state.activeDashboardUUID).toBe("d2");
        });

        it("asks for its counts again, as any load does", () => {
            const phone = buildPhone({Primary: [d1]});
            phone.show(CustomDashboardView, home);
            openAndGoBack(phone);
            phone.focus("/landingView");
            nextFrame();
            nextFrame();
            phone.dispatch.mockClear();

            act(() => {
                jest.advanceTimersByTime(500);
            });

            expect(types(phone.dispatched())).toEqual([Actions.REFRESH_COUNT]);
        });

        it("points the filters at the tab the store made active, which is the first when the remembered one is gone", () => {
            const phone = buildPhone({Primary: [d1, d2]});
            const screen = phone.show(CustomDashboardView, home);
            screen.instance.dashboardToRestore = "d9";
            openAndGoBack(phone);
            phone.dispatch.mockClear();

            phone.focus("/landingView");
            nextFrame();
            nextFrame();

            expect(phone.dispatched()[0]).toMatchObject({type: Actions.ON_LOAD, activeDashboardUUID: "d9"});
            expect(screen.instance.state.activeDashboardUUID).toBe("d1");
            expect(_.last(phone.dispatched())).toEqual({type: FilterActionNames.ON_LOAD, dashboardUUID: "d1"});
        });

        it("points the filters at nothing when it has no dashboard left to show", () => {
            const dashboardsOfType = {None: [d1]};
            const phone = buildPhone(dashboardsOfType);
            const screen = phone.show(CustomDashboardView, menuDashboards);
            openAndGoBack(phone);
            dashboardsOfType.None = [];
            phone.dispatch.mockClear();

            phone.focus("/customDashboardView");
            nextFrame();
            nextFrame();

            expect(types(phone.dispatched())).toEqual([Actions.ON_LOAD, Actions.CLEAR_COUNTS]);
            expect(screen.instance.state.ownerKey).toBe("None|");
            expect(screen.instance.state.dashboards).toEqual([]);
        });

        it("goes by the route LandingView gave it, not by its own path or the router's", () => {
            const phone = buildPhone({Primary: [d1]});
            phone.show(CustomDashboardView, home);
            openAndGoBack(phone);
            phone.dispatch.mockClear();

            phone.focus("/customDashboardView");
            phone.focus("/openedDashboardView");
            nextFrame();
            nextFrame();
            expect(phone.dispatched()).toEqual([]);

            phone.focus("/landingView");
            nextFrame();
            nextFrame();
            expect(types(phone.dispatched())).toContain(Actions.ON_LOAD);
        });

        it("loads once when its route is reported focused twice", () => {
            const phone = buildPhone({Primary: [d1]});
            phone.show(CustomDashboardView, home);
            openAndGoBack(phone);
            phone.dispatch.mockClear();

            phone.focus("/landingView");
            phone.focus("/landingView");
            nextFrame();
            nextFrame();

            expect(types(phone.dispatched()).filter((type) => type === Actions.ON_LOAD)).toHaveLength(1);
            expect(types(phone.dispatched()).filter((type) => type === FilterActionNames.ON_LOAD)).toHaveLength(1);
        });

        it("loads nothing when it unmounts between the focus and the frames", () => {
            const phone = buildPhone({Primary: [d1]});
            const screen = phone.show(CustomDashboardView, home);
            openAndGoBack(phone);
            phone.dispatch.mockClear();

            phone.focus("/landingView");
            screen.close();
            nextFrame();
            nextFrame();

            expect(phone.dispatched()).toEqual([]);
        });
    });

    describe("when its own route comes back into focus after an opened dashboard, and another transition follows", () => {
        it("does not reload when another transition starts within the two frames, as a second back press does", () => {
            const phone = buildPhone({None: [d1, d2]});
            phone.show(CustomDashboardView, menuDashboards);
            openAndGoBack(phone);
            phone.dispatch.mockClear();

            // The first back slide ends and reports Menu → Dashboards focused. The queued second pop starts at once, and
            // its will-focus clears the live focus before the two frames have run.
            phone.focus("/customDashboardView");
            phone.startTransition();
            nextFrame();
            nextFrame();

            expect(types(phone.dispatched())).not.toContain(Actions.ON_LOAD);
            expect(phone.dispatched()).toEqual([]);
        });
    });

    describe("when its own route comes back into focus after a full sync's reset", () => {
        // The reset leaves the state nobody's. The same reset unmounts Home, which mounts again with its own load, and the
        // second tab, which stays unmounted until the user picks it, so Menu → Dashboards is the screen still standing
        // when its route next focuses.
        it("Menu → Dashboards waits two frames, then loads its own dashboard on the tab it remembered, then points the filters at it", () => {
            const phone = buildPhone({None: [d1, d2]});
            const screen = phone.show(CustomDashboardView, menuDashboards);
            // As a tile pressed on tab d2 leaves it.
            screen.instance.dashboardToRestore = "d2";
            expect(phone.state().ownerKey).toBe("None|");
            phone.dispatchFromOutside({type: "RESET"});
            expect(phone.state().ownerKey).toBeNull();
            phone.dispatch.mockClear();

            phone.focus("/customDashboardView");
            expect(phone.dispatched()).toEqual([]);
            nextFrame();
            expect(phone.dispatched()).toEqual([]);
            nextFrame();

            const [onLoad, ...after] = phone.dispatched();
            expect(onLoad).toEqual({type: Actions.ON_LOAD, customDashboardType: undefined, dashboardUUID: undefined, activeDashboardUUID: "d2"});
            // The reset emptied the screen, so its applied-filters bar went away. The bar comes back with the dashboard
            // and points the filter state at it as it mounts, beside the reload's own re-point. Each must point at d2.
            const filterLoads = after.filter((action) => action.type === FilterActionNames.ON_LOAD);
            expect(filterLoads.length).toBeGreaterThan(0);
            expect(_.uniq(filterLoads.map((action) => action.dashboardUUID))).toEqual(["d2"]);
            expect(phone.state().ownerKey).toBe("None|");
            expect(screen.instance.state.activeDashboardUUID).toBe("d2");
        });
    });

    describe("when another screen takes the state while it is in front", () => {
        it("Menu → Dashboards takes its own dashboards back after a background full sync mounts Home under it, and a tab press then works", () => {
            const phone = buildPhone({None: [d1, d2, t1], Primary: [d1]});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.focus("/customDashboardView");

            // The full sync's reset, then LandingView's load, which mounts Home under Menu → Dashboards.
            phone.dispatchFromOutside({type: "RESET"});
            const homeScreen = phone.show(CustomDashboardView, home);
            expect(phone.state().ownerKey).toBe("Primary|");
            const homeState = homeScreen.instance.state;
            nextFrame();
            nextFrame();

            expect(phone.state().ownerKey).toBe("None|");
            expect(menu.instance.state.ownerKey).toBe("None|");
            expect(menu.tabs()).toEqual(["d1", "d2", "t1"]);
            expect(menu.instance.state.activeDashboardUUID).toBe("d1");

            expect(() => act(() => menu.instance.onDashboardNamePress("d2"))).not.toThrow();
            expect(menu.instance.state.activeDashboardUUID).toBe("d2");
            expect(phone.state().ownerKey).toBe("None|");
            expect(homeScreen.instance.state).toBe(homeState);
            expect(homeScreen.instance.state).toMatchObject({ownerKey: "Primary|", dashboards: [d1], activeDashboardUUID: "d1"});
        });

        it.each([
            ["Menu → Dashboards", CustomDashboardView, menuDashboards, "/customDashboardView", "None|", {customDashboardType: undefined, dashboardUUID: undefined}],
            ["An opened dashboard", OpenedDashboardView, {dashboardUUID: "t1"}, "/openedDashboardView", "None|t1", {customDashboardType: undefined, dashboardUUID: "t1"}],
        ])("%s, in front, loads its own dashboard again two frames after a reset leaves the state nobody's", (name, ViewClass, props, path, ownKey, asked) => {
            const phone = buildPhone({None: [d1, d2, t1]});
            const screen = phone.show(ViewClass, props);
            phone.focus(path);
            phone.dispatch.mockClear();

            phone.dispatchFromOutside({type: "RESET"});
            expect(types(phone.dispatched())).toEqual(["RESET"]);
            nextFrame();
            expect(types(phone.dispatched())).toEqual(["RESET"]);
            nextFrame();

            expect(phone.dispatched()[1]).toEqual({type: Actions.ON_LOAD, ...asked, activeDashboardUUID: undefined});
            expect(phone.state().ownerKey).toBe(ownKey);
            expect(screen.instance.state.ownerKey).toBe(ownKey);
            expect(screen.instance.state.activeDashboardUUID).not.toBeNull();
        });

        describe("a screen that is not in front never reloads", () => {
            it("Home under Menu → Dashboards", () => {
                const phone = buildPhone({None: [d1, d2], Primary: [d1]});
                const homeScreen = phone.show(CustomDashboardView, home);
                phone.focus("/landingView");
                // Menu → Dashboards is pushed over LandingView: the transition starts, it mounts and loads, then it focuses.
                phone.startTransition();
                phone.show(CustomDashboardView, menuDashboards);
                phone.focus("/customDashboardView");
                phone.dispatch.mockClear();

                phone.dispatchFromOutside({type: Actions.LOAD_INDICATOR, loading: true});
                expect(frames).toEqual([]);
                nextFrame();
                nextFrame();

                expect(types(phone.dispatched())).toEqual([Actions.LOAD_INDICATOR]);
                expect(homeScreen.instance.state.ownerKey).toBe("Primary|");
            });

            it("the screen underneath an opened dashboard", () => {
                const phone = buildPhone({None: [d1, d2, t1]});
                const menu = phone.show(CustomDashboardView, menuDashboards);
                phone.focus("/customDashboardView");
                // A tile pushes the opened dashboard: the transition starts, it mounts and takes the state, then it focuses.
                phone.startTransition();
                phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
                phone.focus("/openedDashboardView");
                phone.dispatch.mockClear();

                phone.dispatchFromOutside({type: Actions.LOAD_INDICATOR, loading: true});
                expect(frames).toEqual([]);
                nextFrame();
                nextFrame();

                expect(types(phone.dispatched())).toEqual([Actions.LOAD_INDICATOR]);
                expect(menu.instance.state.ownerKey).toBe("None|");
            });

            it("any screen while a transition runs, as no scene is in front then", () => {
                const phone = buildPhone({None: [d1, d2], Primary: [d1]});
                const menu = phone.show(CustomDashboardView, menuDashboards);
                phone.focus("/customDashboardView");
                phone.startTransition();
                phone.dispatch.mockClear();

                // Another screen's load, such as Home mounting during a pop.
                phone.dispatchFromOutside({type: Actions.ON_LOAD, customDashboardType: CustomDashboardType.Primary});
                expect(frames).toEqual([]);
                nextFrame();
                nextFrame();

                expect(types(phone.dispatched())).toEqual([Actions.ON_LOAD]);
                expect(phone.state().ownerKey).toBe("Primary|");
                expect(menu.instance.state.ownerKey).toBe("None|");
            });
        });

        it("does not reload when the focus moves away within the two frames", () => {
            const phone = buildPhone({None: [d1, d2]});
            phone.show(CustomDashboardView, menuDashboards);
            phone.focus("/customDashboardView");
            phone.dispatchFromOutside({type: "RESET"});
            expect(frames).toHaveLength(1);
            phone.dispatch.mockClear();

            nextFrame();
            // The user starts another screen's transition before the second frame.
            phone.startTransition();
            nextFrame();

            expect(phone.dispatched()).toEqual([]);
            expect(phone.state().ownerKey).toBeNull();
        });

        it("does not reload the screen underneath even if a pushed screen took the state before the focus was cleared", () => {
            // The Navigator clears the focus before it mounts a pushed or replacing screen. Were it the other way round, the
            // screen underneath would still be in front when the pushed screen takes the state, and would schedule a reload.
            // The live check at the second frame then finds no scene in front and stops it.
            const phone = buildPhone({None: [d1, d2, t1]});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.focus("/customDashboardView");
            phone.dispatch.mockClear();

            phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
            expect(frames).not.toEqual([]);
            phone.startTransition();
            nextFrame();
            nextFrame();

            expect(phone.dispatched().filter((action) => action.type === Actions.ON_LOAD)).toEqual([
                {type: Actions.ON_LOAD, customDashboardType: undefined, dashboardUUID: "t1"},
            ]);
            expect(phone.state().ownerKey).toBe("None|t1");
            expect(menu.instance.state.ownerKey).toBe("None|");
        });

        it("loads once, from one pending reload, after a burst of store changes", () => {
            const phone = buildPhone({None: [d1, d2], Primary: [d1]});
            phone.show(CustomDashboardView, menuDashboards);
            phone.focus("/customDashboardView");
            phone.dispatch.mockClear();

            phone.dispatchFromOutside({type: "RESET"});
            phone.show(CustomDashboardView, home);
            phone.dispatchFromOutside({type: Actions.LOAD_INDICATOR, loading: false});
            expect(frames).toHaveLength(1);
            nextFrame();
            nextFrame();

            const reloads = phone.dispatched().filter((action) => action.type === Actions.ON_LOAD && _.isNil(action.customDashboardType));
            expect(reloads).toEqual([{type: Actions.ON_LOAD, customDashboardType: undefined, dashboardUUID: undefined, activeDashboardUUID: undefined}]);
            expect(phone.state().ownerKey).toBe("None|");
        });

        it.each(screensUnderneath)("%s, in front with its own state, asks for no frame on any store change", (name, props, path, type) => {
            const phone = buildPhone({[_.defaultTo(type, CustomDashboardType.None)]: [d1, d2]});
            const screen = phone.show(CustomDashboardView, props);
            phone.focus(path);

            phone.dispatchFromOutside({type: Actions.LOAD_INDICATOR, loading: true});
            act(() => screen.instance.onDashboardNamePress("d2"));
            phone.dispatchFromOutside({type: Actions.CLEAR_COUNTS});

            expect(requestAnimationFrame).not.toHaveBeenCalled();
        });

        it("Home does not reload when the bottom bar puts the second tab in its place", () => {
            // React mounts the incoming tab, whose load takes the state, before it unmounts the outgoing one. For that moment
            // Home is still in front without its state, so it may schedule a reload. It is gone by the second frame.
            const phone = buildPhone({Primary: [d1], Secondary: [d2]});
            const homeScreen = phone.show(CustomDashboardView, home);
            phone.focus("/landingView");
            phone.dispatch.mockClear();

            const second = phone.show(CustomDashboardView, secondTab);
            homeScreen.close();
            nextFrame();
            nextFrame();

            expect(phone.dispatched().filter((action) => action.type === Actions.ON_LOAD)).toEqual([
                {type: Actions.ON_LOAD, customDashboardType: CustomDashboardType.Secondary, dashboardUUID: undefined},
            ]);
            expect(phone.state().ownerKey).toBe("Secondary|");
            expect(second.instance.state.ownerKey).toBe("Secondary|");
        });
    });

    describe("when nothing was opened on top", () => {
        it.each(screensUnderneath)("%s loads nothing when its own route focuses", (name, props, path, type) => {
            const phone = buildPhone({[_.defaultTo(type, CustomDashboardType.None)]: [d1]});
            phone.show(CustomDashboardView, props);
            phone.dispatch.mockClear();

            phone.focus(path);
            nextFrame();
            nextFrame();

            expect(phone.dispatched()).toEqual([]);
            expect(frames).toEqual([]);
        });

        it("loads nothing when another route focuses", () => {
            const phone = buildPhone({Primary: [d1]});
            phone.show(CustomDashboardView, home);
            phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
            phone.dispatch.mockClear();

            phone.focus("/openedDashboardView");
            nextFrame();
            nextFrame();

            expect(phone.dispatched()).toEqual([]);
        });
    });

    describe("from the tile to the way back", () => {
        it("brings Menu → Dashboards back on the tab the tile was tapped on", () => {
            const phone = buildPhone({None: [d1, d2, t1]});
            const screen = phone.show(CustomDashboardView, menuDashboards);
            act(() => screen.instance.onDashboardNamePress("d2"));
            act(() => screen.instance.onCardPress("card-1"));
            act(() => {
                jest.advanceTimersByTime(0);
            });
            const cardPress = _.findLast(phone.dispatched(), (action) => action.type === Actions.ON_CARD_PRESS);

            act(() => cardPress.onOpenDashboard("t1"));
            expect(phone.nav.push).toHaveBeenCalledTimes(1);
            const opened = phone.show(OpenedDashboardView, phone.nav.push.mock.calls[0][0].queryParams);
            expect(phone.state().ownerKey).toBe("None|t1");
            expect(screen.instance.state.activeDashboardUUID).toBe("d2");

            opened.close();
            phone.dispatch.mockClear();
            phone.focus("/customDashboardView");
            nextFrame();
            nextFrame();

            expect(phone.dispatched()[0]).toEqual({type: Actions.ON_LOAD, customDashboardType: undefined, dashboardUUID: undefined, activeDashboardUUID: "d2"});
            expect(screen.instance.state.ownerKey).toBe("None|");
            expect(screen.instance.state.activeDashboardUUID).toBe("d2");
            expect(screen.tabs()).toEqual(["d1", "d2", "t1"]);
            expect(_.last(phone.dispatched())).toEqual({type: FilterActionNames.ON_LOAD, dashboardUUID: "d2"});
        });
    });

    describe("a tile press", () => {
        // Opens the tile's dashboard from Menu → Dashboards on tab d2, as a first tap does. The opened screen's load takes the state.
        const openFromTabD2 = () => {
            const phone = buildPhone({None: [d1, d2, t1]}, {tileOpens: "t1"});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            act(() => menu.instance.onDashboardNamePress("d2"));
            press(menu);
            return {phone, menu};
        };

        it("is ignored once the dashboard it opened has taken the state: nothing is dispatched, the tab to restore stays, nothing is pushed", () => {
            const {phone, menu} = openFromTabD2();
            expect(phone.nav.push).toHaveBeenCalledTimes(1);
            expect(menu.instance.dashboardToRestore).toBe("d2");
            phone.show(OpenedDashboardView, phone.nav.push.mock.calls[0][0].queryParams);
            expect(phone.state().ownerKey).toBe("None|t1");
            phone.dispatch.mockClear();

            // The second of two quick taps, let through when the screen redraws between them.
            press(menu);

            expect(phone.dispatched()).toEqual([]);
            expect(menu.instance.dashboardToRestore).toBe("d2");
            expect(phone.nav.push).toHaveBeenCalledTimes(1);
        });

        it("works as before when the state is the screen's own", () => {
            const phone = buildPhone({None: [d1, d2, t1]}, {tileOpens: "t1"});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            act(() => menu.instance.onDashboardNamePress("d2"));
            phone.dispatch.mockClear();

            press(menu);

            expect(phone.dispatched().slice(0, 2)).toEqual([
                {type: Actions.LOAD_INDICATOR, loading: true},
                expect.objectContaining({type: Actions.ON_CARD_PRESS, reportCardUUID: "card-1"}),
            ]);
            expect(menu.instance.dashboardToRestore).toBe("d2");
            expect(phone.nav.push).toHaveBeenCalledTimes(1);
            expect(phone.nav.push).toHaveBeenCalledWith({path: "/openedDashboardView", queryParams: {dashboardUUID: "t1"}, isTyped: true});
        });

        it("still works when the state is nobody's, as today", () => {
            const phone = buildPhone({None: [d1, d2, t1]}, {tileOpens: "t1"});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.dispatchFromOutside({type: "RESET"});
            phone.dispatch.mockClear();

            press(menu);

            expect(types(phone.dispatched()).slice(0, 2)).toEqual([Actions.LOAD_INDICATOR, Actions.ON_CARD_PRESS]);
            expect(phone.nav.push).toHaveBeenCalledTimes(1);
        });
    });

    describe("a tab tap", () => {
        const reloadOnTab = (uuid) => ({type: Actions.ON_LOAD, customDashboardType: undefined, dashboardUUID: undefined, activeDashboardUUID: uuid});

        it("is remembered, so the reload after a reset while Menu → Dashboards is in front comes back on that tab", () => {
            const phone = buildPhone({None: [d1, d2, d3]});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.focus("/customDashboardView");
            act(() => menu.instance.onDashboardNamePress("d3"));
            phone.dispatch.mockClear();

            phone.dispatchFromOutside({type: "RESET"});
            nextFrame();
            nextFrame();

            expect(phone.dispatched()[1]).toEqual(reloadOnTab("d3"));
            expect(menu.instance.state.activeDashboardUUID).toBe("d3");
        });

        it("made after the return from an opened dashboard wins over the tab the tile was pressed on", () => {
            const phone = buildPhone({None: [d1, d2, d3, t1]}, {tileOpens: "t1"});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.focus("/customDashboardView");
            act(() => menu.instance.onDashboardNamePress("d2"));
            // The tile on d2 opens t1: the push starts a transition, the opened screen mounts and takes the state, it focuses.
            press(menu);
            phone.startTransition();
            const opened = phone.show(OpenedDashboardView, phone.nav.push.mock.calls[0][0].queryParams);
            phone.focus("/openedDashboardView");
            // Back: the pop starts a transition, the opened screen goes, Menu → Dashboards focuses and comes back on d2.
            phone.startTransition();
            opened.close();
            phone.focus("/customDashboardView");
            nextFrame();
            nextFrame();
            expect(menu.instance.state.activeDashboardUUID).toBe("d2");

            act(() => menu.instance.onDashboardNamePress("d3"));
            phone.dispatch.mockClear();
            phone.dispatchFromOutside({type: "RESET"});
            nextFrame();
            nextFrame();

            expect(phone.dispatched()[1]).toEqual(reloadOnTab("d3"));
            expect(menu.instance.state.activeDashboardUUID).toBe("d3");
        });

        it("made before the reload, after a background full sync mounted Home under Menu → Dashboards, dispatches nothing, and the reload lands on that tab", () => {
            const phone = buildPhone({None: [d1, d2, t1], Primary: [d1]});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.focus("/customDashboardView");
            phone.dispatchFromOutside({type: "RESET"});
            const homeScreen = phone.show(CustomDashboardView, home);
            const homeState = homeScreen.instance.state;
            phone.dispatch.mockClear();

            // Within the two frames before the reload, the state is Home's.
            expect(() => act(() => menu.instance.onDashboardNamePress("d2"))).not.toThrow();
            expect(phone.dispatched()).toEqual([]);
            nextFrame();
            nextFrame();

            expect(phone.dispatched()[0]).toEqual(reloadOnTab("d2"));
            expect(phone.state().ownerKey).toBe("None|");
            expect(menu.instance.state.activeDashboardUUID).toBe("d2");
            expect(homeScreen.instance.state).toBe(homeState);
        });

        it("with the state its own works as before", () => {
            const phone = buildPhone({None: [d1, d2]});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.dispatch.mockClear();

            act(() => menu.instance.onDashboardNamePress("d2"));

            expect(phone.dispatched()).toEqual([
                {type: FilterActionNames.ON_LOAD, dashboardUUID: "d2"},
                {type: Actions.ON_DASHBOARD_CHANGE, dashboardUUID: "d2"},
            ]);
            expect(menu.instance.state.activeDashboardUUID).toBe("d2");
            act(() => {
                jest.advanceTimersByTime(500);
            });
            expect(types(phone.dispatched())).toEqual([FilterActionNames.ON_LOAD, Actions.ON_DASHBOARD_CHANGE, Actions.REFRESH_COUNT]);
        });

        it("with the state nobody's, after a reset, works as before", () => {
            const phone = buildPhone({None: [d1, d2]});
            const menu = phone.show(CustomDashboardView, menuDashboards);
            phone.dispatchFromOutside({type: "RESET"});
            phone.dispatch.mockClear();

            act(() => menu.instance.onDashboardNamePress("d2"));

            // The tap's own two dispatches come first. The reset emptied the screen, so its applied-filters bar comes
            // back with the tab and points the filter state at it once more, as it does today.
            expect(phone.dispatched().slice(0, 2)).toEqual([
                {type: FilterActionNames.ON_LOAD, dashboardUUID: "d2"},
                {type: Actions.ON_DASHBOARD_CHANGE, dashboardUUID: "d2"},
            ]);
            expect(phone.state().activeDashboardUUID).toBe("d2");
        });
    });

    describe("the As On Date and clear-filters controls", () => {
        const dashboards = {Primary: [d1], None: [d1, t1]};
        // The controls as the screen hands them out: the Tomorrow button's handler and the applied-filters bar.
        // Today is already filled, so pressing it does nothing.
        const controlsOf = (screen) => {
            const tomorrow = screen.root.findAll((node) => node.type === TouchableOpacity && node.findAllByType(Text)
                .some((text) => text.props.children === "i18n:Tomorrow"))[0];
            const pressed = tomorrow.props.onPress;
            const bar = screen.root.findByType(AppliedFiltersV2).instance;
            return {pressTomorrow: () => act(() => pressed()), clear: (postClear) => act(() => bar.onClearFilter(postClear))};
        };
        const showHome = (phone) => {
            const screen = phone.show(CustomDashboardView, home);
            return {screen, ...controlsOf(screen)};
        };

        it("do nothing on Home while an opened dashboard owns the state", () => {
            const phone = buildPhone(dashboards, {asOnDate: true});
            const homeScreen = showHome(phone);
            // The opened dashboard takes the state, as a tile press does, and Home stays underneath.
            phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
            expect(phone.state().ownerKey).toBe("None|t1");
            phone.dispatch.mockClear();
            const postClear = jest.fn();

            homeScreen.pressTomorrow();
            homeScreen.clear(postClear);

            expect(phone.dispatched()).toEqual([]);
            expect(postClear).not.toHaveBeenCalled();
        });

        it("work as before when the state is the screen's own", () => {
            const phone = buildPhone(dashboards, {asOnDate: true});
            const homeScreen = showHome(phone);
            phone.dispatch.mockClear();
            const postClear = jest.fn();

            homeScreen.pressTomorrow();
            homeScreen.clear(postClear);

            expect(types(phone.dispatched())).toEqual(expect.arrayContaining([FilterActionNames.ON_FILTER_UPDATE, FilterActionNames.CLEAR_FILTER]));
            expect(postClear).toHaveBeenCalledTimes(1);
        });

        it("are not drawn after a full sync's reset, and the screen counts the state nobody owns as its own, so they work once the reload brings them back", () => {
            const phone = buildPhone(dashboards, {asOnDate: true});
            const homeScreen = phone.show(CustomDashboardView, home);
            expect(homeScreen.root.findAllByType(AppliedFiltersV2)).toHaveLength(1);

            phone.dispatchFromOutside({type: "RESET"});

            expect(phone.state().ownerKey).toBeNull();
            // The reset leaves no dashboard to show, so the block holding the quick dates and the bar is not drawn.
            expect(homeScreen.root.findAllByType(AppliedFiltersV2)).toHaveLength(0);
            expect(homeScreen.root.findAll((node) => node.type === Text && node.props.children === "i18n:Tomorrow")).toHaveLength(0);
            expect(homeScreen.instance.ownsSharedDashboardState()).toBe(true);
        });
    });

    describe("the Filter button and the refresh row", () => {
        const dashboards = {Primary: [d1], None: [d1, t1]};
        // The controls as the screen draws them: the touchable under the Filter text, and the touchable of the element
        // drawn with the onRefreshPressed prop. Taken from what is on screen, so the screen's own handlers run.
        const showHome = (phone) => {
            const screen = phone.show(CustomDashboardView, home);
            // The count refresh the mount schedules runs 500 ms later and gives the screen its last refreshed time.
            act(() => {
                jest.advanceTimersByTime(500);
            });
            const filter = screen.root.findAll((node) => node.props.onPress && node.findAllByType(Text)
                .some((text) => text.props.children === "i18n:filter"))[0];
            const refreshRow = screen.root.findAll((node) => _.isFunction(node.props.onRefreshPressed))[0];
            const refresh = refreshRow.findAll((node) => _.isFunction(node.props.onPress))[0];
            return {screen, pressFilter: () => act(() => filter.props.onPress()), pressRefresh: () => act(() => refresh.props.onPress())};
        };

        it("do nothing on Home while an opened dashboard owns the state", () => {
            const phone = buildPhone(dashboards, {asOnDate: true, autoRefreshOff: true});
            const homeScreen = showHome(phone);
            phone.show(OpenedDashboardView, {dashboardUUID: "t1"});
            expect(phone.state().ownerKey).toBe("None|t1");
            phone.dispatch.mockClear();

            homeScreen.pressFilter();
            homeScreen.pressRefresh();

            expect(phone.nav.push).not.toHaveBeenCalled();
            expect(phone.dispatched()).toEqual([]);
        });

        it("work as before when the state is the screen's own", () => {
            const phone = buildPhone(dashboards, {asOnDate: true, autoRefreshOff: true});
            const homeScreen = showHome(phone);
            expect(phone.state().ownerKey).toBe("Primary|");
            phone.dispatch.mockClear();

            homeScreen.pressFilter();
            homeScreen.pressRefresh();

            expect(phone.nav.push).toHaveBeenCalledTimes(1);
            expect(phone.nav.push).toHaveBeenCalledWith({path: "/FilterViewV2", queryParams: expect.objectContaining({dashboardUUID: "d1"}), isTyped: true});
            expect(types(phone.dispatched()).slice(0, 2)).toEqual([Actions.FORCE_REFRESH, Actions.CLEAR_COUNTS]);
        });
    });
});
