import _ from "lodash";
import General from "../../utility/General";

/**
 * Tracks whether the current scene's transition has finished, and notifies subscribers.
 *
 * This is deliberately STATE rather than a fire-and-forget event. A screen rendered inside its parent's
 * renderLoaded() is mounted only AFTER that scene has already focused; with a plain event it would wait
 * for a focus that never comes and fall through to AbstractComponent's LOAD_FALLBACK_MS timer. Nested
 * screens stacked those waits — measured at 1.5–6.1s on the subject dashboard, on screens whose own work
 * took milliseconds (avni-client#2054 code review).
 *
 * Kept as a plain class, separate from Router, because Router cannot be instantiated under jest — it
 * pulls in react-native-deprecated-custom-components. This carries the logic worth testing.
 *
 * @param schedule how to defer a replay. Router passes a frame callback; tests pass a queue. Replays are
 *        never run inline, so a subscriber cannot be invoked during its own subscribe() call.
 */
export default class SceneFocusRegistry {
    constructor(schedule) {
        this.schedule = schedule;
        this.listeners = new Set();
        this.focusedRoute = null;
    }

    /** A scene has finished transitioning. Notifies current subscribers and arms replay for later ones. */
    markFocused(route) {
        this.focusedRoute = route;
        this.listeners.forEach((listener) => this.notify(listener, route));
    }

    /** A new transition has begun, so the previous focus is stale and must not be replayed. */
    markTransitionStarted() {
        this.focusedRoute = null;
    }

    /**
     * Subscribe to transition-complete. If the current scene has ALREADY settled, the listener is
     * scheduled immediately rather than left waiting for a focus that will not repeat.
     * @returns unsubscribe
     */
    subscribe(listener) {
        this.listeners.add(listener);
        if (!_.isNil(this.focusedRoute)) {
            const route = this.focusedRoute;
            this.schedule(() => {
                // Re-check: the listener may have unsubscribed between subscribe() and the replay, and
                // the scene may have moved on.
                if (!this.listeners.has(listener)) return;
                this.notify(listener, route);
            });
        }
        return () => this.listeners.delete(listener);
    }

    notify(listener, route) {
        try {
            listener(route);
        } catch (e) {
            // One screen's load must not stop the rest of the app hearing about the transition.
            General.logErrorAsInfo("SceneFocusRegistry", e);
        }
    }
}
