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

// The real card reads the subject out of Realm; this test is about when it renders, not what it shows.
jest.mock("../../../src/views/common/IndividualDetailsCard", () => ({
    __esModule: true,
    default: ({individual}) => {
        const {Text} = require("react-native");
        return require("react").createElement(Text, null, individual.uuid);
    },
}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));

let mockHeaderProps;
jest.mock("../../../src/views/individual/SearchResultsHeader", () => ({
    __esModule: true,
    default: (props) => {
        mockHeaderProps.push(props);
        return null;
    },
}));

// SafeAreaProvider renders nothing until it has native insets, which swallows the whole subtree.
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));
jest.mock("../../../src/views/common/CHSContent", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));

// Importing the real one drags in CHSNavigator and the whole native-module graph behind it.
jest.mock("../../../src/views/individual/SubjectRegisterFromTaskView", () => ({__esModule: true, default: () => null}));

import {PaginatedView} from "../../../src/views/individual/IndividualSearchResultPaginatedView";
import ServiceContext from "../../../src/framework/context/ServiceContext";

const serviceContext = {getService: () => ({getI18n: () => ({t: (k) => k})})};

const results = (count) => _.range(count).map((i) => ({uuid: `i-${i}`}));

const mount = (count) => {
    let tr;
    act(() => {
        tr = TestRenderer.create(
            <ServiceContext.Provider value={serviceContext}>
                <PaginatedView results={results(count)}
                               onIndividualSelection={_.noop}
                               currentPage={{}}
                               title="someCard"
                               I18n={{t: (k) => k}}
                               onRegisterClick={_.noop}/>
            </ServiceContext.Provider>,
        );
    });
    return tr;
};

const cards = (tr) => _.uniq(JSON.stringify(tr.toJSON()).match(/i-\d+/g) || []);

describe("PaginatedView deferred first chunk", () => {
    beforeEach(() => {
        mockCapturedCallbacks = [];
        mockHeaderProps = [];
    });

    it("renders the spinner and no cards during mount", () => {
        const tr = mount(25);

        expect(cards(tr)).toHaveLength(0);
        expect(tr.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
        expect(mockCapturedCallbacks).toHaveLength(1);
    });

    it("renders the first chunk once the deferred callback fires", () => {
        const tr = mount(25);

        act(() => mockCapturedCallbacks[0]());

        expect(cards(tr)).toHaveLength(20);
    });

    it("shows no spinner when there is nothing to load", () => {
        const tr = mount(0);

        expect(tr.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    });

    it("hides the displayed count while the first chunk is pending", () => {
        mount(25);

        // Otherwise the header reads "25 matching results / displayed: 0" for the whole deferral.
        expect(_.last(mockHeaderProps).displayResultCounts).toBe(false);

        act(() => mockCapturedCallbacks[0]());

        expect(_.last(mockHeaderProps).displayResultCounts).toBe(true);
        expect(_.last(mockHeaderProps).displayedCount).toBe(20);
    });

    it("does not update after unmount", () => {
        const tr = mount(25);

        act(() => tr.unmount());

        expect(() => act(() => mockCapturedCallbacks[0]())).not.toThrow();
    });
});
