// Every dashboard screen shares one piece of dashboard state. A tile opens another dashboard on its own screen, and that
// screen takes the state over. Meanwhile the screen underneath (Home, the second bottom tab, or Menu → Dashboards) keeps
// showing its own dashboard. When the user comes back to it, it loads its own dashboard again, on the tab they left,
// and points the filter screen's state back at itself.
// Covers the scene focus subscription, which store states a screen takes, and the reload after its own route focuses.

import React from "react";
import _ from "lodash";
import TestRenderer, {act} from "react-test-renderer";

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
jest.mock("../../../src/views/filter/FiltersViewV2", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/checklist/ChecklistListingView", () => ({__esModule: true, default: () => null}));
// The header is read through its props, and the container only has to pass its children on.
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/common/CHSContainer", () => ({__esModule: true, default: ({children}) => children}));

import CustomDashboardView, {OpenedDashboardView} from "../../../src/views/customDashboard/CustomDashboardView";
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
const t1 = {uuid: "t1", name: "Village detail", voided: false};

// These actions go through the real dashboard reducer, as they decide whose state the store holds and which tab is
// active. Every other action, such as the card press or the filter screen's load, is recorded and changes nothing.
const reducedActions = [Actions.ON_LOAD, Actions.ON_DASHBOARD_CHANGE, Actions.CLEAR_COUNTS, Actions.LOAD_INDICATOR];

// The phone as these tests need it: a store that runs the dashboard reducer and tells its subscribers of every
// dispatch, screens that can be mounted on top of one another, and a router whose scene focus the test reports.
// `dashboardsOfType` can be changed after mount, as a sync can change which dashboards a user has.
const buildPhone = (dashboardsOfType) => {
    const dashboards = [d1, d2, t1];
    const reducerServices = new Map([
        [CustomDashboardService, {
            // As the real service does, a missing type gives the None list.
            getDashboards: (type) => dashboardsOfType[_.defaultTo(type, CustomDashboardType.None)] || [],
            findByUUID: (uuid) => _.find(dashboards, (dashboard) => dashboard.uuid === uuid),
            getDashboardData: () => ({selectedFilterValues: {}, dashboardCache: {filterApplied: false}}),
        }],
        [DashboardFilterService, {areFiltersPresent: () => false}],
        [DashboardSectionCardMappingService, {getAllCardsForDashboard: () => []}],
    ]);
    const reducerContext = {get: (Class) => reducerServices.get(Class)};

    let state = CustomDashboardActions.getInitialState();
    const storeListeners = new Set();
    const dispatch = jest.fn((action) => {
        if (action.type === "RESET") state = CustomDashboardActions.getInitialState();
        else if (_.includes(reducedActions, action.type)) state = CustomDashboardActionMap.get(action.type)(state, action, reducerContext);
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

    const i18n = {t: (key) => `i18n:${key}`};
    const viewServices = new Map([
        [MessageService, {getI18n: () => i18n}],
        [UserInfoService, {
            getUserSettingsObject: () => ({}),
            getUserInfo: () => ({getDisplayUsername: () => "Asha Devi"}),
        }],
        [OrganisationConfigService, {isGuideUserToRegisterButtonOn: () => false}],
        [DashboardFilterService, {getFilters: () => [], getFilterConfigsForDashboard: () => ({})}],
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
        // The router's signal that a scene has finished its transition, as Router.didFocus sends it.
        focus: (path) => act(() => [...focusListeners].forEach((listener) => listener({path}))),
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
});
