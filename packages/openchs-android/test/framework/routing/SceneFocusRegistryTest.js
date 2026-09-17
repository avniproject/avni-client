import SceneFocusRegistry from "../../../src/framework/routing/SceneFocusRegistry";

// The transition-complete signal has to be STATE, not a fire-and-forget event.
//
// A screen mounted inside its parent's renderLoaded() comes into existence AFTER that scene has already
// focused. With an event, it waits for the next focus — which for a settled screen never arrives — so it
// burned the full LOAD_FALLBACK_MS. Nested screens stacked those waits (avni-client#2054 review).
describe("SceneFocusRegistry", () => {
    let registry;
    let scheduled;

    // The registry schedules replays rather than calling inline, so a subscriber can never be invoked
    // during its own subscribe() call. Tests drive the queue explicitly.
    const schedule = (fn) => scheduled.push(fn);
    const runScheduled = () => {
        const queued = scheduled;
        scheduled = [];
        queued.forEach((fn) => fn());
    };

    beforeEach(() => {
        scheduled = [];
        registry = new SceneFocusRegistry(schedule);
    });

    it("notifies a listener that subscribed before the scene focused", () => {
        const listener = jest.fn();
        registry.subscribe(listener);

        registry.markFocused({path: "/A"});

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({path: "/A"});
    });

    it("replays to a listener that subscribed AFTER the scene focused", () => {
        registry.markFocused({path: "/A"});

        const listener = jest.fn();
        registry.subscribe(listener);
        expect(listener).not.toHaveBeenCalled();   // scheduled, never inline

        runScheduled();
        expect(listener).toHaveBeenCalledWith({path: "/A"});
    });

    it("does not replay once a new transition has started", () => {
        registry.markFocused({path: "/A"});
        registry.markTransitionStarted();

        const listener = jest.fn();
        registry.subscribe(listener);
        runScheduled();

        expect(listener).not.toHaveBeenCalled();
    });

    it("notifies a listener exactly once per focus, not once per subscribe and focus", () => {
        registry.markFocused({path: "/A"});
        const listener = jest.fn();
        registry.subscribe(listener);
        runScheduled();
        expect(listener).toHaveBeenCalledTimes(1);

        registry.markFocused({path: "/B"});
        expect(listener).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenLastCalledWith({path: "/B"});
    });

    it("stops notifying after unsubscribe", () => {
        const listener = jest.fn();
        const unsubscribe = registry.subscribe(listener);

        unsubscribe();
        registry.markFocused({path: "/A"});

        expect(listener).not.toHaveBeenCalled();
    });

    it("does not replay to a listener that unsubscribed before the scheduled replay ran", () => {
        registry.markFocused({path: "/A"});
        const listener = jest.fn();
        const unsubscribe = registry.subscribe(listener);

        unsubscribe();
        runScheduled();

        expect(listener).not.toHaveBeenCalled();
    });

    // Two listeners that subscribe after focus must be replayed in subscription order, from ONE
    // scheduled drain. A schedule() per listener left the order to the platform: Router schedules on a
    // frame callback, RN implements those as native timers, and Android holds them in a PriorityQueue
    // keyed only on target time - two armed in the same millisecond can arrive in either order. A
    // component that subscribes twice on mount then ran its two loads inverted (avni-client#2101).
    it("replays post-focus subscribers in subscription order, from a single scheduled drain", () => {
        registry.markFocused({path: "/A"});
        const order = [];
        registry.subscribe(() => order.push("first"));
        registry.subscribe(() => order.push("second"));

        expect(scheduled.length).toBe(1);
        runScheduled();
        expect(order).toEqual(["first", "second"]);
    });

    it("schedules a fresh drain for a listener that subscribes after the last one ran", () => {
        registry.markFocused({path: "/A"});
        const first = jest.fn();
        registry.subscribe(first);
        runScheduled();

        const late = jest.fn();
        registry.subscribe(late);
        expect(late).not.toHaveBeenCalled();

        runScheduled();
        expect(late).toHaveBeenCalledWith({path: "/A"});
        expect(first).toHaveBeenCalledTimes(1);
    });

    it("a throwing listener does not stop the others", () => {
        const boom = () => { throw new Error("boom"); };
        const after = jest.fn();
        registry.subscribe(boom);
        registry.subscribe(after);

        registry.markFocused({path: "/A"});

        expect(after).toHaveBeenCalledTimes(1);
    });
});
