import React from "react";
import TestRenderer, {act} from "react-test-renderer";
import {Text} from "react-native";

// Same capture trick as AbstractComponentDeferredLoadTest: the interaction-based defer is the
// fallback path here, so the test controls whether it ever runs.
let mockCapturedCallbacks;
jest.mock("../../../src/utility/deferPastInteractions", () => ({
    __esModule: true,
    default: (cb) => mockCapturedCallbacks.push(cb),
}));

import AbstractComponent from "../../../src/framework/view/AbstractComponent";
import ServiceContext from "../../../src/framework/context/ServiceContext";

// A stand-in for what Router publishes: subscribe to "the scene transition finished".
const makeContext = (subscribeSceneDidFocus) => ({
    getService: () => ({getI18n: () => ({t: (k) => k})}),
    getStore: () => ({getState: () => ({}), subscribe: () => () => {}}),
    getDB: () => ({}),
    ...(subscribeSceneDidFocus ? {subscribeSceneDidFocus} : {}),
});

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

// The load is scheduled behind a double requestAnimationFrame so the scene's final commit paints
// before the JS thread blocks. Under fake timers rAF is a queued callback, so flush a few rounds.
const flushFrames = () => {
    for (let i = 0; i < 3; i++) act(() => { jest.runOnlyPendingTimers(); });
};

const mount = (loadImpl, context) => {
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

describe("AbstractComponent load waits for the scene transition", () => {
    let listeners;
    let subscribe;

    let realRaf;

    beforeEach(() => {
        jest.useFakeTimers();
        // Route rAF through the fake timer queue so flushFrames() can drive the double-rAF the
        // component schedules. On device these are real frames; here they just need to be drainable.
        realRaf = global.requestAnimationFrame;
        global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
        mockCapturedCallbacks = [];
        listeners = [];
        subscribe = (fn) => {
            listeners.push(fn);
            return () => {
                listeners = listeners.filter((l) => l !== fn);
            };
        };
    });

    afterEach(() => {
        global.requestAnimationFrame = realRaf;
        jest.useRealTimers();
    });

    it("holds the loader until the scene reports the transition complete", () => {
        const loadImpl = jest.fn();
        const tr = mount(loadImpl, makeContext(subscribe));

        // The interaction-based defer settles before the slide's last frame — it must NOT start the
        // block, because doing so starves the animation and leaves the outgoing screen on screen.
        expect(loadImpl).not.toHaveBeenCalled();
        expect(treeText(tr)).not.toContain("loaded-content");

        act(() => listeners.forEach((l) => l()));
        expect(loadImpl).not.toHaveBeenCalled();   // still waiting for the frame to commit
        flushFrames();

        expect(loadImpl).toHaveBeenCalledTimes(1);
        expect(treeText(tr)).toContain("loaded-content");
    });

    // Drives runDeferredLoad() directly rather than through the listener: the first run unsubscribes,
    // so firing the listener twice would pass even with the idempotence guard removed — it never
    // reaches the guard. Verified by mutation: deleting the _loadStarted check must turn this red.
    it("runs the load exactly once even when the trigger arrives again", () => {
        const loadImpl = jest.fn();
        const tr = mount(loadImpl, makeContext(subscribe));
        const instance = tr.root.findByType(TestScreen).instance;

        act(() => instance.runDeferredLoad());
        act(() => instance.runDeferredLoad());
        act(() => instance.runDeferredLoad());
        flushFrames();

        expect(loadImpl).toHaveBeenCalledTimes(1);
    });

    it("falls back to a timer when the transition notification never arrives", () => {
        const loadImpl = jest.fn();
        const tr = mount(loadImpl, makeContext(subscribe));

        expect(loadImpl).not.toHaveBeenCalled();
        flushFrames();

        expect(loadImpl).toHaveBeenCalledTimes(1);
        expect(treeText(tr)).toContain("loaded-content");
    });

    it("uses the interaction defer when no scene notifier is available", () => {
        const loadImpl = jest.fn();
        mount(loadImpl, makeContext(undefined));   // e.g. mounted outside the Router

        expect(mockCapturedCallbacks.length).toBe(1);
        act(() => mockCapturedCallbacks[0]());
        flushFrames();
        expect(loadImpl).toHaveBeenCalledTimes(1);
    });

    it("does not load, and leaves no listener, after unmount", () => {
        const loadImpl = jest.fn();
        const tr = mount(loadImpl, makeContext(subscribe));

        act(() => tr.unmount());
        expect(listeners.length).toBe(0);

        flushFrames();
        expect(loadImpl).not.toHaveBeenCalled();
    });
});
