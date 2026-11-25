// Verifies the two rules a dashboard screen uses to share one piece of dashboard state with the other dashboard screens.
// sceneFocusNeedsReload: when the screen's own route comes back into focus and another screen has taken the state, the
// screen loads its own dashboard again. ownsStoreState: until then, it takes only a state that is its own or nobody's.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {ownsStoreState, sceneFocusNeedsReload} from "../../../src/action/customDashboard/CustomDashboardActions";

describe("sceneFocusNeedsReload", () => {
    it("reloads when its own route comes back and another screen owns the state", () => {
        assert.isTrue(sceneFocusNeedsReload({path: "/landingView"}, "/landingView", "None|t1", "Primary|"));
    });

    it("does not reload when it still owns the state", () => {
        // One load per screen opened: once the reload has made the state its own again, a later focus loads nothing.
        assert.isFalse(sceneFocusNeedsReload({path: "/landingView"}, "/landingView", "Primary|", "Primary|"));
    });

    it("ignores another route's focus", () => {
        assert.isFalse(sceneFocusNeedsReload({path: "/openedDashboardView"}, "/customDashboardView", "None|t1", "None|"));
    });

    it("ignores focus when its own route is unknown", () => {
        assert.isFalse(sceneFocusNeedsReload({path: "/landingView"}, undefined, "None|t1", "Primary|"));
        assert.isFalse(sceneFocusNeedsReload({path: "/landingView"}, null, "None|t1", "Primary|"));
        // Even when the focus names no route either, so an unknown route never matches an unknown route.
        assert.isFalse(sceneFocusNeedsReload({}, undefined, "None|t1", "Primary|"));
        assert.isFalse(sceneFocusNeedsReload(undefined, null, "None|t1", "Primary|"));
    });

    it("ignores a focus that names no route", () => {
        assert.isFalse(sceneFocusNeedsReload(undefined, "/landingView", "None|t1", "Primary|"));
        assert.isFalse(sceneFocusNeedsReload({}, "/landingView", "None|t1", "Primary|"));
    });
});

describe("ownsStoreState", () => {
    it("takes store states it owns, or that nobody owns yet", () => {
        assert.isTrue(ownsStoreState(null, "Primary|"));
        assert.isTrue(ownsStoreState(undefined, "Primary|"));
        assert.isTrue(ownsStoreState("Primary|", "Primary|"));
        assert.isFalse(ownsStoreState("None|t1", "Primary|"));
    });
});
