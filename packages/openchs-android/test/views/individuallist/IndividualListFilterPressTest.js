import React from "react";
import TestRenderer, {act} from "react-test-renderer";

global.requestAnimationFrame = (cb) => cb();

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
jest.mock("../../../src/reducer", () => ({
    __esModule: true,
    default: {reducerKeys: {myDashboard: "myDashboard"}},
}));
const mockNavigateToFilterView = jest.fn();
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {navigateToFilterView: (...args) => mockNavigateToFilterView(...args)},
}));
jest.mock("../../../src/action/mydashboard/MyDashboardActions", () => ({
    __esModule: true,
    MyDashboardActionNames: {RESET_LIST: "RESET_LIST", ON_LIST_LOAD: "ON_LIST_LOAD", APPLY_FILTERS: "APPLY_FILTERS"},
}));
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

const SUBJECT_TYPE = {uuid: "st-2", name: "Household"};

const mount = () => {
    const storeState = {
        myDashboard: {
            itemsToDisplay: [], individuals: {data: []}, date: {value: null},
            selectedSubjectType: SUBJECT_TYPE,
        }
    };
    const context = {
        getService: () => ({getI18n: () => ({t: (k) => k})}),
        getStore: () => ({getState: () => storeState, subscribe: () => () => {}, dispatch: () => {}}),
        getDB: () => ({}),
    };
    act(() => {
        TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <IndividualList params={{listType: "overdue", cardTitle: "overdue"}}/>
            </ServiceContext.Provider>,
        );
    });
    act(() => mockCapturedCallbacks[0]());
};

describe("IndividualList filter press", () => {
    beforeEach(() => {
        mockCapturedCallbacks = [];
        mockListProps = [];
        mockNavigateToFilterView.mockClear();
    });

    it("hands Filter the dashboard's subject type, so it does not fall back to the first one", () => {
        mount();
        act(() => mockListProps[mockListProps.length - 1].iconFunction());

        expect(mockNavigateToFilterView).toHaveBeenCalledTimes(1);
        const props = mockNavigateToFilterView.mock.calls[0][1];
        expect(props.selectedSubjectType).toBe(SUBJECT_TYPE);
        expect(props.listType).toBe("overdue");
    });
});
