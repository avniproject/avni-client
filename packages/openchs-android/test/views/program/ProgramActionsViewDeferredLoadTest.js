import React from "react";
import {ActivityIndicator} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

// Capture the deferred callback so the test controls when it runs.
let mockCapturedCallbacks;
jest.mock("../../../src/utility/deferPastInteractions", () => ({
    __esModule: true,
    default: (cb) => mockCapturedCallbacks.push(cb),
}));

// The global setup stubs Analytics as undefined, which the AbstractComponent constructor calls into.
jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));

// Importing the real view otherwise drags in the whole reducer/navigator graph and its native modules.
jest.mock("../../../src/reducer", () => ({
    __esModule: true,
    default: {reducerKeys: {startProgramActions: "startProgramActions"}},
}));
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/views/program/GrowthChartView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/service/PrivilegeService", () => ({__esModule: true, default: class PrivilegeService {}}));
jest.mock("../../../src/action/program/StartProgramActions", () => {
    const onLoad = () => {};
    onLoad.Id = "StartProgramActions.onLoad";
    return {
        __esModule: true,
        StartProgramActions: {onLoad, getInitialState: () => ({encounters: [], encounterTypes: []})},
    };
});

import ProgramActionsView from "../../../src/views/program/ProgramActionsView";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import {StartProgramActions} from "../../../src/action/program/StartProgramActions";

const enrolment = (uuid, isActive = true) => ({
    uuid,
    isActive,
    hasChecklist: false,
    checklists: [],
    program: null,
    individual: {subjectType: {uuid: "st-1"}},
});

const buildContext = (dispatched) => {
    let storeState = {startProgramActions: StartProgramActions.getInitialState()};
    const subscribers = [];
    return {
        getService: (Class) => {
            if (Class && Class.name === "PrivilegeService") {
                return {hasAllPrivileges: () => true, allowedEntityTypeUUIDListForCriteria: () => []};
            }
            return {
                getI18n: () => ({t: (k) => k}),
                hasAllPrivileges: () => true,
                allowedEntityTypeUUIDListForCriteria: () => [],
            };
        },
        getStore: () => ({
            getState: () => storeState,
            subscribe: (fn) => {
                subscribers.push(fn);
                return () => {};
            },
            dispatch: (action) => {
                dispatched.push(action);
                // Mimic the reducer landing an eligible encounter so the button can render.
                storeState = {
                    startProgramActions: {
                        ...storeState.startProgramActions,
                        enrolment: {uuid: action.enrolmentUUID},
                        isSingle: false,
                        allAllowed: [{encounterType: {name: "Lab test"}, parent: {}}],
                    },
                };
                subscribers.forEach((fn) => fn());
            },
        }),
        getDB: () => ({}),
    };
};

const view = (enrolmentUUID, isActive, dashboardButtons, dispatched) => (
    <ServiceContext.Provider value={buildContext(dispatched)}>
        <ProgramActionsView enrolment={enrolment(enrolmentUUID, isActive)}
                            allowedEncounterTypeUuids={[]}
                            programDashboardButtons={dashboardButtons}/>
    </ServiceContext.Provider>
);

const mount = (dispatched, enrolmentUUID = "e-1", isActive = true) => {
    let tr;
    const context = buildContext(dispatched);
    act(() => {
        tr = TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <ProgramActionsView enrolment={enrolment(enrolmentUUID, isActive)}
                                    allowedEncounterTypeUuids={[]}
                                    programDashboardButtons={[]}/>
            </ServiceContext.Provider>,
        );
    });
    tr.rerenderWith = (dashboardButtons) => act(() => tr.update(
        <ServiceContext.Provider value={context}>
            <ProgramActionsView enrolment={enrolment(enrolmentUUID, isActive)}
                                allowedEncounterTypeUuids={[]}
                                programDashboardButtons={dashboardButtons}/>
        </ServiceContext.Provider>,
    ));
    return tr;
};

const loadDispatches = (dispatched) =>
    dispatched.filter((a) => a.type === StartProgramActions.onLoad.Id);

const spinners = (tr) => tr.root.findAllByType(ActivityIndicator);

const renderedText = (tr) => JSON.stringify(tr.toJSON());

describe("ProgramActionsView deferred load", () => {
    beforeEach(() => {
        mockCapturedCallbacks = [];
    });

    it("does not dispatch the eligibility load during mount", () => {
        const dispatched = [];
        mount(dispatched);

        // The whole point: nothing heavy runs while the navigation slide is still animating.
        expect(loadDispatches(dispatched)).toHaveLength(0);
        expect(mockCapturedCallbacks).toHaveLength(1);
    });

    it("dispatches the load once the deferred callback fires", () => {
        const dispatched = [];
        mount(dispatched);

        act(() => mockCapturedCallbacks[0]());

        expect(loadDispatches(dispatched)).toHaveLength(1);
    });

    it("does not re-dispatch on the update caused by its own forceUpdate", () => {
        const dispatched = [];
        mount(dispatched);

        act(() => mockCapturedCallbacks[0]());

        // forceUpdate re-renders and so reaches componentDidUpdate; an unguarded reload here would
        // run the full per-encounter-type eligibility pass a second time.
        expect(loadDispatches(dispatched)).toHaveLength(1);
    });

    it("does not dispatch if unmounted before the deferred callback fires", () => {
        const dispatched = [];
        const tr = mount(dispatched);

        act(() => tr.unmount());
        act(() => mockCapturedCallbacks[0]());

        expect(loadDispatches(dispatched)).toHaveLength(0);
    });

    it("holds the action slot with a placeholder while the load is pending", () => {
        const tr = mount([]);

        // Without this the slot renders empty, which is what it shows when nothing is eligible.
        expect(spinners(tr)).toHaveLength(1);
    });

    it("replaces the placeholder with the action button once the load lands", () => {
        const tr = mount([]);

        act(() => mockCapturedCallbacks[0]());

        expect(spinners(tr)).toHaveLength(0);
        expect(renderedText(tr)).toContain("newProgramVisit");
    });

    it("shows no placeholder for an inactive enrolment", () => {
        // An exited enrolment never gets an action button, so a spinner there would resolve to nothing.
        const tr = mount([], "e-1", false);

        expect(spinners(tr)).toHaveLength(0);
    });

    it("clears the placeholder when a prop change loads before the deferred callback", () => {
        // SubjectDashboardProgramsTab lands dashboardButtons after interactions too, and the store
        // update that follows is rejected by shouldComponentUpdate, so the load has to force a render.
        const dispatched = [];
        const tr = mount(dispatched);

        tr.rerenderWith([{label: "growthChart"}]);

        expect(loadDispatches(dispatched)).toHaveLength(1);
        expect(spinners(tr)).toHaveLength(0);
        expect(renderedText(tr)).toContain("newProgramVisit");
    });

    it("does not run the eligibility pass twice when the deferred callback follows a prop change", () => {
        const dispatched = [];
        const tr = mount(dispatched);

        tr.rerenderWith([{label: "growthChart"}]);
        act(() => mockCapturedCallbacks[0]());

        expect(loadDispatches(dispatched)).toHaveLength(1);
    });
});
