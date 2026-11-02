// The dashboard a tile opens: another dashboard on its own screen, titled with its own name, with a back button and
// no tab strip. It is a subclass of the dashboard screen, registered at its own path, because the router reuses the
// screen underneath when the same path is pushed twice.
// Covers where it registers, how a tile opens it (pushed from a dashboard, replacing an opened one), what it loads at
// mount, its title, tab strip and empty message, and the two callbacks the tile press hands to the card press action.

import React from "react";
import {ToastAndroid} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

// The global setup stubs Analytics as undefined, which the AbstractComponent constructor calls into.
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

import CustomDashboardView, {OpenedDashboardView, openDashboardFrom} from "../../../src/views/customDashboard/CustomDashboardView";
import CustomDashboardTab from "../../../src/views/customDashboard/CustomDashboardTab";
import AppHeader from "../../../src/views/common/AppHeader";
import AppliedFiltersV2 from "../../../src/views/filter/AppliedFiltersV2";
import PathRegistry from "../../../src/framework/routing/PathRegistry";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import {CustomDashboardActionNames as Actions} from "../../../src/action/customDashboard/CustomDashboardActions";
import {CustomDashboardType} from "../../../src/service/customDashboard/CustomDashboardService";
import MessageService from "../../../src/service/MessageService";
import UserInfoService from "../../../src/service/UserInfoService";
import OrganisationConfigService from "../../../src/service/OrganisationConfigService";
import DashboardFilterService from "../../../src/service/reports/DashboardFilterService";
import EntityService from "../../../src/service/EntityService";
import english from "../../../translations/en.json";

// Marks every translated text, so a test can tell a translated title from a bare key.
const i18n = {t: (key) => `i18n:${key}`};

const supervisorDashboard = {uuid: "d1", name: "Supervisor view"};
const monthlyDashboard = {uuid: "d2", name: "Monthly review"};

const stateWith = (dashboards) => ({
    dashboards,
    activeDashboardUUID: dashboards.length > 0 ? dashboards[0].uuid : null,
    cardToCountResultMap: {},
    reportCardSectionMappings: [],
    customDashboardFilters: [],
    hasFiltersSet: false,
    filtersPresent: false,
    loading: false,
    resultUpdatedAt: null,
});

// `store.state` can be changed after mount without the screen hearing of it, as the screen's own state is a copy
// that catches up a moment after the store changes.
const buildContext = ({store, dispatch, nav, welcomeOn}) => {
    const services = new Map([
        [MessageService, {getI18n: () => i18n}],
        [UserInfoService, {
            getUserSettingsObject: () => ({}),
            getUserInfo: () => ({getDisplayUsername: () => "Asha Devi"}),
        }],
        [OrganisationConfigService, {isGuideUserToRegisterButtonOn: () => welcomeOn}],
        [DashboardFilterService, {getFilters: () => [], getFilterConfigsForDashboard: () => ({})}],
        [EntityService, {findByUUID: () => undefined}],
    ]);
    return {
        getService: (Class) => {
            if (!services.has(Class)) throw new Error(`unexpected service ${Class && Class.name}`);
            return services.get(Class);
        },
        getStore: () => ({
            getState: () => ({customDashboard: store.state}),
            subscribe: () => () => {},
            dispatch,
        }),
        navigator: () => nav,
    };
};

const mount = (ViewClass, props = {}, {state = stateWith([supervisorDashboard]), welcomeOn = false} = {}) => {
    const store = {state};
    const dispatch = jest.fn();
    const nav = {push: jest.fn(), replace: jest.fn(), getCurrentRoutes: jest.fn(() => [])};
    const context = buildContext({store, dispatch, nav, welcomeOn});
    let tr;
    act(() => {
        tr = TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <ViewClass {...props}/>
            </ServiceContext.Provider>,
        );
    });
    const instance = tr.root.findByType(ViewClass).instance;
    const dispatched = () => dispatch.mock.calls.map(([action]) => action);
    return {tr, store, dispatch, dispatched, nav, instance};
};

const titleOf = (tr) => tr.root.findByType(AppHeader).props.title;
const tabsOf = (tr) => tr.root.findAllByType(CustomDashboardTab);
const timesShown = (tr, text) => (JSON.stringify(tr.toJSON()).match(new RegExp(text, "g")) || []).length;

// Presses a tile as the screen does, and hands back what the screen gave the card press action.
const pressTile = (instance, dispatched) => {
    instance.onCardPress("card-1");
    act(() => {
        jest.advanceTimersByTime(0);
    });
    return dispatched().find((action) => action.type === Actions.ON_CARD_PRESS);
};

const loaderOffCall = (dispatch) => dispatch.mock.calls.findIndex(([a]) => a.type === Actions.LOAD_INDICATOR && a.loading === false);

describe("OpenedDashboardView", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe("registration", () => {
        it("registers the opened dashboard at its own path", () => {
            expect(OpenedDashboardView.path()).toBe("/openedDashboardView");
            expect(CustomDashboardView.path()).toBe("/customDashboardView");
            expect(OpenedDashboardView.prototype instanceof CustomDashboardView).toBe(true);
            expect(PathRegistry.views.has(OpenedDashboardView)).toBe(true);
            expect(PathRegistry.views.has(CustomDashboardView)).toBe(true);
        });

        it("gives each screen its own name", () => {
            expect(mount(OpenedDashboardView, {dashboardUUID: "d1"}).instance.viewName()).toBe("OpenedDashboardView");
            expect(mount(CustomDashboardView).instance.viewName()).toBe("CustomDashboardView");
        });
    });

    describe("openDashboardFrom", () => {
        const route = {path: "/openedDashboardView", queryParams: {dashboardUUID: "t1"}, isTyped: true};
        const fakeView = (props) => {
            const nav = {push: jest.fn(), replace: jest.fn(), getCurrentRoutes: jest.fn(() => [])};
            return {view: {props, context: {navigator: () => nav}}, nav};
        };

        it("pushes from a dashboard and replaces from an opened dashboard", () => {
            const fromDashboard = fakeView({});
            openDashboardFrom(fromDashboard.view, "t1");
            expect(fromDashboard.nav.push).toHaveBeenCalledTimes(1);
            expect(fromDashboard.nav.push).toHaveBeenCalledWith(route);
            expect(fromDashboard.nav.replace).not.toHaveBeenCalled();

            const fromOpened = fakeView({dashboardUUID: "d"});
            openDashboardFrom(fromOpened.view, "t1");
            expect(fromOpened.nav.replace).toHaveBeenCalledTimes(1);
            expect(fromOpened.nav.replace).toHaveBeenCalledWith(route);
            expect(fromOpened.nav.push).not.toHaveBeenCalled();
        });

        it("pushes, as from a dashboard, when the dashboardUUID is empty, which ON_LOAD takes to mean none", () => {
            const fromEmpty = fakeView({dashboardUUID: ""});
            openDashboardFrom(fromEmpty.view, "t1");
            expect(fromEmpty.nav.push).toHaveBeenCalledTimes(1);
            expect(fromEmpty.nav.push).toHaveBeenCalledWith(route);
            expect(fromEmpty.nav.replace).not.toHaveBeenCalled();
        });
    });

    describe("at mount", () => {
        it("asks for the dashboard it was opened for", () => {
            const {dispatched} = mount(OpenedDashboardView, {dashboardUUID: "d1"});
            const onLoad = dispatched().find((action) => action.type === Actions.ON_LOAD);
            expect(onLoad.dashboardUUID).toBe("d1");
            expect(onLoad.customDashboardType).toBeUndefined();
        });

        it("asks for its kind of dashboard, and for no single one, when it is not opened on its own", () => {
            const {dispatched} = mount(CustomDashboardView, {customDashboardType: CustomDashboardType.Primary});
            const onLoad = dispatched().find((action) => action.type === Actions.ON_LOAD);
            expect(onLoad.customDashboardType).toBe(CustomDashboardType.Primary);
            expect(onLoad.dashboardUUID).toBeUndefined();
        });
    });

    describe("title", () => {
        it("is the title it was given, translated", () => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1", title: "Team view"});
            expect(titleOf(tr)).toBe("i18n:Team view");
        });

        it("is the dashboard's own name, translated, when no title was given", () => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1"});
            expect(titleOf(tr)).toBe("i18n:Supervisor view");
        });

        it("is the dashboards title when nothing loaded", () => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1"}, {state: stateWith([])});
            expect(titleOf(tr)).toBe("i18n:dashboards");
        });

        it.each([
            ["a title was given", {title: "Team view"}, stateWith([supervisorDashboard])],
            ["a dashboard loaded", {}, stateWith([supervisorDashboard])],
            ["nothing loaded", {}, stateWith([])],
        ])("is never the welcome message, when %s", (when, props, state) => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1", ...props}, {state, welcomeOn: true});
            expect(titleOf(tr)).not.toContain("welcomeMessage");
        });

        it("is as before without a dashboard to open: the welcome message when it is on", () => {
            expect(titleOf(mount(CustomDashboardView, {}, {welcomeOn: true}).tr)).toBe("i18n:welcomeMessage");
        });

        it("is as before without a dashboard to open: the title it was given, or the dashboards title", () => {
            expect(titleOf(mount(CustomDashboardView, {title: "Team view"}).tr)).toBe("i18n:Team view");
            expect(titleOf(mount(CustomDashboardView, {}).tr)).toBe("i18n:dashboards");
        });
    });

    describe("tab strip and empty message", () => {
        const twoDashboards = stateWith([supervisorDashboard, monthlyDashboard]);

        it("shows one tab for each dashboard, as before, when no dashboard was asked for and the type is nil or None", () => {
            expect(tabsOf(mount(CustomDashboardView, {}, {state: twoDashboards}).tr)).toHaveLength(2);
            expect(tabsOf(mount(CustomDashboardView, {customDashboardType: CustomDashboardType.None}, {state: twoDashboards}).tr)).toHaveLength(2);
        });

        it("shows no tabs, as before, for any other type", () => {
            expect(tabsOf(mount(CustomDashboardView, {customDashboardType: CustomDashboardType.Primary}, {state: twoDashboards}).tr)).toHaveLength(0);
        });

        it("shows no tabs when a dashboard was asked for, whatever the type", () => {
            expect(tabsOf(mount(OpenedDashboardView, {dashboardUUID: "d1"}).tr)).toHaveLength(0);
            expect(tabsOf(mount(OpenedDashboardView, {dashboardUUID: "d1", customDashboardType: CustomDashboardType.None}).tr)).toHaveLength(0);
        });

        it("says no dashboard is available when the one asked for did not load, rather than showing a blank screen", () => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1"}, {state: stateWith([])});
            expect(timesShown(tr, "i18n:dashboardsNotAvailable")).toBe(1);
        });

        it("does not say it when the dashboard loaded", () => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1"});
            expect(timesShown(tr, "i18n:dashboardsNotAvailable")).toBe(0);
        });

        it("says it once, as before, when there is no dashboard at all and no dashboard was asked for", () => {
            const {tr} = mount(CustomDashboardView, {}, {state: stateWith([])});
            expect(timesShown(tr, "i18n:dashboardsNotAvailable")).toBe(1);
        });
    });

    describe("what an opened dashboard keeps from any other dashboard", () => {
        const withFilters = {state: {...stateWith([supervisorDashboard]), filtersPresent: true}};

        it("keeps the back button", () => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1"});
            expect(tr.root.findByType(AppHeader).props.hideBackButton).toBeFalsy();
        });

        it("keeps the strip of filters applied to the dashboard", () => {
            const {tr} = mount(OpenedDashboardView, {dashboardUUID: "d1"});
            const applied = tr.root.findAllByType(AppliedFiltersV2);
            expect(applied).toHaveLength(1);
            expect(applied[0].props.dashboardUUID).toBe("d1");
        });

        it("keeps the filter button when the dashboard has filters, and shows none when it has none", () => {
            expect(timesShown(mount(OpenedDashboardView, {dashboardUUID: "d1"}).tr, '"i18n:filter"')).toBe(0);
            expect(timesShown(mount(OpenedDashboardView, {dashboardUUID: "d1"}, withFilters).tr, '"i18n:filter"')).toBe(1);
        });
    });

    describe("a dashboardUUID that is empty", () => {
        // ON_LOAD takes an empty one to mean none, and loads the dashboards of the screen's type. The screen has to
        // look the way that load leaves it.
        const twoDashboards = stateWith([supervisorDashboard, monthlyDashboard]);
        const props = {dashboardUUID: "", customDashboardType: CustomDashboardType.None};

        it("shows the tab strip, as a screen with no dashboard asked for does", () => {
            const {tr} = mount(OpenedDashboardView, props, {state: twoDashboards});
            expect(tabsOf(tr)).toHaveLength(2);
        });

        it("is titled as a screen with no dashboard asked for is, not with a dashboard's name", () => {
            expect(titleOf(mount(OpenedDashboardView, props, {state: twoDashboards, welcomeOn: true}).tr)).toBe("i18n:welcomeMessage");
            expect(titleOf(mount(OpenedDashboardView, props, {state: twoDashboards}).tr)).toBe("i18n:dashboards");
        });
    });

    describe("when a tile is pressed", () => {
        const route = {path: "/openedDashboardView", queryParams: {dashboardUUID: "t1"}, isTyped: true};

        it("hands the card press action a way to open a dashboard and a way to say it is not available", () => {
            const {instance, dispatched} = mount(CustomDashboardView);
            const action = pressTile(instance, dispatched);
            expect(action.onOpenDashboard).toEqual(expect.any(Function));
            expect(action.onDashboardNotAvailable).toEqual(expect.any(Function));
        });

        describe("and the dashboard opens", () => {
            it("dismisses the loader before it navigates", () => {
                const {instance, dispatch, dispatched, nav} = mount(CustomDashboardView);
                const action = pressTile(instance, dispatched);
                act(() => action.onOpenDashboard("t1"));
                const loaderOff = loaderOffCall(dispatch);
                expect(loaderOff).toBeGreaterThan(-1);
                expect(dispatch.mock.invocationCallOrder[loaderOff]).toBeLessThan(nav.push.mock.invocationCallOrder[0]);
            });

            it("remembers the dashboard that is active in the store, not the one the screen last saw", () => {
                const {instance, dispatched, store} = mount(CustomDashboardView, {}, {state: stateWith([supervisorDashboard, monthlyDashboard])});
                const action = pressTile(instance, dispatched);
                store.state = {...store.state, activeDashboardUUID: "d2"};
                expect(instance.state.activeDashboardUUID).toBe("d1");
                act(() => action.onOpenDashboard("t1"));
                expect(instance.dashboardToRestore).toBe("d2");
            });

            it("reads that dashboard before the push, as mounting the opened screen makes its own dashboard the active one", () => {
                const {instance, dispatched, store, nav} = mount(CustomDashboardView, {}, {state: stateWith([supervisorDashboard, monthlyDashboard])});
                const action = pressTile(instance, dispatched);
                // A real push mounts the opened screen, whose ON_LOAD makes the dashboard it was opened for the active one.
                nav.push.mockImplementation((pushed) => {
                    store.state = {...store.state, activeDashboardUUID: pushed.queryParams.dashboardUUID};
                });
                act(() => action.onOpenDashboard("t1"));
                expect(nav.push).toHaveBeenCalledTimes(1);
                expect(store.state.activeDashboardUUID).toBe("t1");
                expect(instance.dashboardToRestore).toBe("d1");
            });

            it("pushes the opened dashboard when the tile is on a dashboard", () => {
                const {instance, dispatched, nav} = mount(CustomDashboardView);
                const action = pressTile(instance, dispatched);
                act(() => action.onOpenDashboard("t1"));
                expect(nav.push).toHaveBeenCalledTimes(1);
                expect(nav.push).toHaveBeenCalledWith(route);
                expect(nav.replace).not.toHaveBeenCalled();
            });

            it("replaces the opened dashboard when the tile is on an opened dashboard", () => {
                const {instance, dispatched, nav} = mount(OpenedDashboardView, {dashboardUUID: "d1"});
                const action = pressTile(instance, dispatched);
                act(() => action.onOpenDashboard("t1"));
                expect(nav.replace).toHaveBeenCalledTimes(1);
                expect(nav.replace).toHaveBeenCalledWith(route);
                expect(nav.push).not.toHaveBeenCalled();
            });
        });

        describe("and the dashboard is not available", () => {
            let toast;
            let short;
            let long;

            beforeEach(() => {
                // The stand-in for this platform has the same number for both lengths, so give each its own.
                short = ToastAndroid.SHORT;
                long = ToastAndroid.LONG;
                ToastAndroid.SHORT = 7001;
                ToastAndroid.LONG = 7002;
                toast = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
            });

            afterEach(() => {
                toast.mockRestore();
                ToastAndroid.SHORT = short;
                ToastAndroid.LONG = long;
            });

            it("dismisses the loader, then shows the message briefly", () => {
                const {instance, dispatch, dispatched} = mount(CustomDashboardView);
                const action = pressTile(instance, dispatched);
                act(() => action.onDashboardNotAvailable());
                const loaderOff = loaderOffCall(dispatch);
                expect(loaderOff).toBeGreaterThan(-1);
                expect(toast).toHaveBeenCalledTimes(1);
                expect(toast).toHaveBeenCalledWith("i18n:dashboardNotAvailableToUser", 7001);
                expect(dispatch.mock.invocationCallOrder[loaderOff]).toBeLessThan(toast.mock.invocationCallOrder[0]);
            });

            it("goes nowhere", () => {
                const {instance, dispatched, nav} = mount(CustomDashboardView);
                const action = pressTile(instance, dispatched);
                act(() => action.onDashboardNotAvailable());
                expect(nav.push).not.toHaveBeenCalled();
                expect(nav.replace).not.toHaveBeenCalled();
            });
        });
    });

    describe("message text", () => {
        it("says the dashboard is not available to the user, in English", () => {
            expect(english.translations).toHaveProperty("dashboardNotAvailableToUser", "This dashboard is not available to you");
        });
    });
});
