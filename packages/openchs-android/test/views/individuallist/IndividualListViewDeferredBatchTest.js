import React from "react";
import {ActivityIndicator} from "react-native";
import TestRenderer, {act} from "react-test-renderer";
import _ from "lodash";

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

// Importing the real card would drag in the navigator/service graph; the test is about when it renders.
jest.mock("../../../src/views/individuallist/IndividualDetails", () => ({
    __esModule: true,
    default: ({individualWithMetadata}) => {
        const {Text} = require("react-native");
        return require("react").createElement(Text, null, individualWithMetadata.individual.uuid);
    },
}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/individual/SearchResultsHeader", () => ({__esModule: true, default: () => null}));
// SafeAreaProvider renders nothing until it has native insets, which swallows the whole subtree.
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));

// native-base primitives need a NativeBaseProvider above them, which this test has no use for.
jest.mock("native-base", () => {
    const RN = require("react-native");
    return {__esModule: true, View: RN.View, Text: RN.Text};
});

import IndividualListView from "../../../src/views/individuallist/IndividualListView";
import ServiceContext from "../../../src/framework/context/ServiceContext";

const buildContext = (dispatched) => ({
    getService: () => ({getI18n: () => ({t: (k) => k})}),
    getStore: () => ({
        getState: () => ({}),
        subscribe: () => () => {},
        dispatch: (action) => dispatched.push(action),
    }),
    getDB: () => ({}),
});

const results = (count) =>
    _.range(count).map((i) => ({individual: {uuid: `i-${i}`}, visitInfo: {groupingBy: "g", visitName: []}}));

const mount = (dispatched, count) => {
    let tr;
    act(() => {
        tr = TestRenderer.create(
            <ServiceContext.Provider value={buildContext(dispatched)}>
                <IndividualListView results={results(count)}
                                    totalSearchResultsCount={count}
                                    headerTitle="someCard"
                                    indicatorActionName="LOAD_INDICATOR"/>
            </ServiceContext.Provider>,
        );
    });
    return tr;
};

const cards = (tr) => _.uniq(JSON.stringify(tr.toJSON()).match(/i-\d+/g) || []);

describe("IndividualListView deferred batch", () => {
    beforeEach(() => {
        mockCapturedCallbacks = [];
    });

    it("renders the spinner and no cards during mount", () => {
        const tr = mount([], 5);

        // Each card reads the subject out of Realm; building them here would freeze the slide in.
        expect(cards(tr)).toHaveLength(0);
        expect(tr.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
        expect(mockCapturedCallbacks).toHaveLength(1);
    });

    it("dismisses the previous screen's loading modal on mount, not with the batch", () => {
        const dispatched = [];
        mount(dispatched, 5);

        // It is a full-screen modal owned by the dashboard; holding it hides the slide behind it.
        expect(dispatched).toEqual([{type: "LOAD_INDICATOR", loading: false}]);
    });

    it("renders the batch once the deferred callback fires", () => {
        const tr = mount([], 5);

        act(() => mockCapturedCallbacks[0]());

        expect(cards(tr)).toHaveLength(5);
        expect(tr.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    });

    it("does not defer, and still dismisses the modal, when there are no results", () => {
        const dispatched = [];
        const tr = mount(dispatched, 0);

        expect(mockCapturedCallbacks).toHaveLength(0);
        expect(dispatched).toEqual([{type: "LOAD_INDICATOR", loading: false}]);
        expect(tr.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    });

    it("does not build the batch if unmounted before the deferred callback fires", () => {
        const tr = mount([], 5);

        act(() => tr.unmount());

        expect(() => act(() => mockCapturedCallbacks[0]())).not.toThrow();
    });
});
