import React from "react";
import TestRenderer, {act} from "react-test-renderer";

// Capture the deferred callback so the test controls when it runs.
let mockCapturedCallbacks;
jest.mock("../../../src/utility/deferPastInteractions", () => ({
    __esModule: true,
    default: (cb) => mockCapturedCallbacks.push(cb),
}));

jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));

// Importing the real ones drags in the whole reducer/navigator graph and its native modules.
jest.mock("../../../src/reducer", () => ({
    __esModule: true,
    default: {reducerKeys: {myDashboard: "myDashboard"}},
}));
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/action/mydashboard/MyDashboardActions", () => ({
    __esModule: true,
    MyDashboardActionNames: {RESET_LIST: "RESET_LIST", ON_LIST_LOAD: "ON_LIST_LOAD", APPLY_FILTERS: "APPLY_FILTERS"},
}));

// Stubbed so the test can read the props the list is driven with.
let mockListProps;
jest.mock("../../../src/views/individuallist/IndividualListView", () => ({
    __esModule: true,
    default: (props) => {
        mockListProps.push(props);
        return null;
    },
}));

import IndividualList from "../../../src/views/individuallist/IndividualList";
import ServiceContext from "../../../src/framework/context/ServiceContext";

const buildContext = (dispatched) => {
    const storeState = {myDashboard: {itemsToDisplay: [], individuals: {data: []}, date: {value: null}}};
    return {
        getService: () => ({getI18n: () => ({t: (k) => k})}),
        getStore: () => ({
            getState: () => storeState,
            subscribe: () => () => {},
            dispatch: (action) => dispatched.push(action),
        }),
        getDB: () => ({}),
    };
};

const mount = (dispatched) => {
    let tr;
    act(() => {
        tr = TestRenderer.create(
            <ServiceContext.Provider value={buildContext(dispatched)}>
                <IndividualList params={{listType: "overdue", cardTitle: "overdue"}}/>
            </ServiceContext.Provider>,
        );
    });
    return tr;
};

const types = (dispatched) => dispatched.map((a) => a.type);

describe("IndividualList deferred list load", () => {
    beforeEach(() => {
        mockCapturedCallbacks = [];
        mockListProps = [];
    });

    it("does not run the list query during mount, and marks the list as loading", () => {
        const dispatched = [];
        mount(dispatched);

        expect(types(dispatched)).toEqual(["RESET_LIST"]);
        expect(mockCapturedCallbacks).toHaveLength(1);
        // Without this the empty list renders straight away and reads as "no due visits".
        expect(mockListProps[0].loading).toBe(true);
    });

    it("runs the list query once the deferred callback fires and clears loading", () => {
        const dispatched = [];
        mount(dispatched);

        act(() => mockCapturedCallbacks[0]());

        expect(types(dispatched)).toEqual(["RESET_LIST", "ON_LIST_LOAD"]);
        expect(_last(mockListProps).loading).toBe(false);
    });

    it("does not run the list query if unmounted before the deferred callback fires", () => {
        const dispatched = [];
        const tr = mount(dispatched);

        act(() => tr.unmount());
        act(() => mockCapturedCallbacks[0]());

        expect(types(dispatched)).toEqual(["RESET_LIST"]);
    });
});

const _last = (arr) => arr[arr.length - 1];
