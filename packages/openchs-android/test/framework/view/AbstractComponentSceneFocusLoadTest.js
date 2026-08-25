import React from "react";
import TestRenderer, {act} from "react-test-renderer";
import {Text} from "react-native";

// Same capture trick as AbstractComponentDeferredLoadTest: the interaction-based defer is the
// fallback path here, so the test controls whether it ever runs.
let mockCapturedCallbacks;
// Only this suite constructs a screen WITH a topLevelStateVariable (the stale-error test), which is the
// path that touches Analytics. Stubbed so the test is about error surfacing, not about analytics wiring.
jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));

jest.mock("../../../src/utility/deferPastInteractions", () => ({
    __esModule: true,
    default: (cb) => mockCapturedCallbacks.push(cb),
}));

import AbstractComponent from "../../../src/framework/view/AbstractComponent";
import ServiceContext from "../../../src/framework/context/ServiceContext";

// A stand-in for what Router publishes: subscribe to "the scene transition finished".
const makeContext = (subscribeSceneDidFocus, routePath) => ({
    getService: () => ({getI18n: () => ({t: (k) => k})}),
    getStore: () => ({getState: () => ({}), subscribe: () => () => {}}),
    getDB: () => ({}),
    ...(subscribeSceneDidFocus ? {subscribeSceneDidFocus} : {}),
    ...(routePath === undefined ? {} : {currentRoutePath: () => routePath}),
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
// rAF is synchronous in this suite, so frames need no draining. Kept as a named no-op so each test
// still reads as "let the frame land" rather than silently relying on that.
const flushFrames = () => act(() => {});

// Advances past LOAD_FALLBACK_MS. Separate from flushFrames on purpose: a test asserting "this focus
// must NOT fire the load" would otherwise pass or fail on the fallback timer instead.
const runFallbackTimer = () => act(() => { jest.advanceTimersByTime(AbstractComponent.LOAD_FALLBACK_MS); });

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
        // Synchronous rAF: the component schedules its load behind a double rAF so the scene's final
        // commit paints first. Resolving inline here keeps the tests about WHICH trigger fired, not
        // about draining frame queues.
        global.requestAnimationFrame = (cb) => cb();
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
        runFallbackTimer();

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

    // Regression guard for a defect found in code review: SubjectDashboardProgramsTab registers
    // loadData() through the base class AND dispatchOnLoad() from onViewDidMount. When the registration
    // state lived in single instance fields, the first fire set a shared flag and the SECOND callback
    // never ran at all — ON_LOAD silently never dispatched — while the first listener leaked into the
    // Router forever. Each registration must be independent.
    it("runs every registration when a component subscribes more than once", () => {
        const first = jest.fn();
        const second = jest.fn();
        const tr = mount(jest.fn(), makeContext(subscribe));
        const instance = tr.root.findByType(TestScreen).instance;

        act(() => instance.runAfterSceneTransition(first));
        act(() => instance.runAfterSceneTransition(second));
        act(() => listeners.slice().forEach((l) => l()));
        flushFrames();

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it("releases every listener on unmount, not just the last registration", () => {
        const tr = mount(jest.fn(), makeContext(subscribe));
        const instance = tr.root.findByType(TestScreen).instance;

        act(() => instance.runAfterSceneTransition(jest.fn()));
        act(() => instance.runAfterSceneTransition(jest.fn()));
        act(() => tr.unmount());

        expect(listeners.length).toBe(0);
    });

    // The Router passes the route to every listener and AbstractComponent used to discard it, so scene
    // B's transition fired a still-mounted screen A's pending load mid-slide — reintroducing the freeze
    // on a screen the user had already left (avni-client#2054 review).
    it("ignores a transition that belongs to a different route", () => {
        const loadImpl = jest.fn();
        mount(loadImpl, makeContext(subscribe, "/ScreenA"));

        act(() => listeners.slice().forEach((l) => l({path: "/ScreenB"})));
        flushFrames();
        expect(loadImpl).not.toHaveBeenCalled();

        act(() => listeners.slice().forEach((l) => l({path: "/ScreenA"})));
        flushFrames();
        expect(loadImpl).toHaveBeenCalledTimes(1);
    });

    it("still loads when the route is unknown, rather than waiting forever", () => {
        const loadImpl = jest.fn();
        mount(loadImpl, makeContext(subscribe, undefined));

        act(() => listeners.slice().forEach((l) => l({path: "/Anything"})));
        flushFrames();

        expect(loadImpl).toHaveBeenCalledTimes(1);
    });

    // refreshState() calls showError() on any non-nil error in its slice. Entry work used to be
    // dispatched in willMount BEFORE super's subscribe/refreshState, so that slice had just been
    // rebuilt by this screen. Deferring the dispatch inverted it: refreshState now runs at mount and
    // reads whatever the PREVIOUS occupant of the shared slice left behind, alert included, over the
    // loading spinner (avni-client#2054 review).
    it("does not surface an error left in the slice by a previous screen", () => {
        const shown = [];
        const stateSlice = {error: {message: "left over from the last screen"}};
        const ctx = {
            ...makeContext(subscribe, "/ScreenA"),
            getStore: () => ({getState: () => ({slice: stateSlice}), subscribe: () => () => {}}),
        };

        class SliceScreen extends AbstractComponent {
            constructor(props, c) { super(props, c, "slice"); }
            viewName() { return "SliceScreen"; }
            showError(message) { shown.push(message); }
            loadData() { this.props.loadImpl(); }
            renderLoaded() { return null; }
        }

        let tr;
        act(() => {
            tr = TestRenderer.create(
                <ServiceContext.Provider value={ctx}>
                    <SliceScreen loadImpl={jest.fn()}/>
                </ServiceContext.Provider>,
            );
        });

        expect(shown).toEqual([]);   // not this screen's error — its own load has not run yet

        const instance = tr.root.findByType(SliceScreen).instance;
        act(() => instance.runDeferredLoad());
        stateSlice.error = {message: "raised by this screen"};
        act(() => instance.refreshState());

        expect(shown).toEqual(["raised by this screen"]);
    });

    it("does not load, and leaves no listener, after unmount", () => {
        const loadImpl = jest.fn();
        const tr = mount(loadImpl, makeContext(subscribe));

        act(() => tr.unmount());
        expect(listeners.length).toBe(0);

        runFallbackTimer();
        expect(loadImpl).not.toHaveBeenCalled();
    });
});
