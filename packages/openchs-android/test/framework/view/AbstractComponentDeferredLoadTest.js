import React from "react";
import TestRenderer, {act} from "react-test-renderer";
import {Text} from "react-native";

// Capture the deferred-load callback so the test controls when — and whether — it runs.
let mockCapturedCallbacks;
jest.mock("../../../src/utility/deferPastInteractions", () => ({
    __esModule: true,
    default: (cb) => mockCapturedCallbacks.push(cb),
}));

global.requestAnimationFrame = (cb) => cb();

import AbstractComponent from "../../../src/framework/view/AbstractComponent";
import ServiceContext from "../../../src/framework/context/ServiceContext";

const context = {
    getService: () => ({getI18n: () => ({t: (k) => k})}),
    getStore: () => ({getState: () => ({}), subscribe: () => () => {}}),
    getDB: () => ({}),
};

// No topLevelStateVariable → the base skips the store; isDataLoaded() is just _loadStarted, so this
// exercises the base state machine (loader → loaded/error) without a reducer.
class TestScreen extends AbstractComponent {
    constructor(props, ctx) {
        super(props, ctx, undefined);
    }

    viewName() {
        return "TestScreen";
    }

    loadData() {
        this.props.loadImpl();
    }

    renderLoaded() {
        return <Text>loaded-content</Text>;
    }
}

const treeText = (tr) => JSON.stringify(tr.toJSON());

const mount = (loadImpl) => {
    let tr;
    act(() => {
        tr = TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <TestScreen loadImpl={loadImpl}/>
            </ServiceContext.Provider>,
        );
    });
    return tr;
};

describe("AbstractComponent deferred load", () => {
    beforeEach(() => {
        mockCapturedCallbacks = [];
    });

    it("shows the loader until loadData runs, then renderLoaded — even when loadData changes no state", () => {
        const tr = mount(() => {});
        expect(treeText(tr)).not.toContain("loaded-content");

        act(() => mockCapturedCallbacks[0]());
        expect(treeText(tr)).toContain("loaded-content");   // cleared via forceUpdate, not a reducer diff
    });

    it("renders the error state, not renderLoaded, when loadData throws", () => {
        const tr = mount(() => {
            throw new Error("boom");
        });

        act(() => mockCapturedCallbacks[0]());
        const text = treeText(tr);
        expect(text).not.toContain("loaded-content");
        expect(text).toContain("goBack");                   // renderLoadError (stub I18n.t returns the key)
    });

    it("does not run loadData if unmounted before the deferred callback fires", () => {
        const loadImpl = jest.fn();
        const tr = mount(loadImpl);

        act(() => tr.unmount());
        act(() => mockCapturedCallbacks[0]());
        expect(loadImpl).not.toHaveBeenCalled();
    });
});
