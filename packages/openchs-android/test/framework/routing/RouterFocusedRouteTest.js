// The Router tells screens which scene is in front through `focusedRoute` in its ServiceContext value. The accessor
// reads the focus registry live: the route once its scene has focused, and null from the moment a transition starts.
// Unlike currentRoutePath, which follows whichever scene rendered last, it is never stale while a pop is under way.

import React from "react";
import TestRenderer, {act} from "react-test-renderer";

// The real Navigator cannot run under jest. This one renders nothing and keeps the context the Router gives its scenes.
let mockSceneContext;
jest.mock("react-native-deprecated-custom-components", () => {
    const mockReact = require("react");
    const mockServiceContext = require("../../../src/framework/context/ServiceContext").default;
    function Navigator() {
        mockSceneContext = mockReact.useContext(mockServiceContext);
        return null;
    }
    Navigator.SceneConfigs = {PushFromRight: {}};
    return {Navigator};
});

import Router from "../../../src/framework/routing/Router";

describe("Router.focusedRoute", () => {
    let renderer;
    let router;

    beforeEach(() => {
        act(() => {
            renderer = TestRenderer.create(<Router initialRoute={{path: "/landingView"}}/>);
        });
        router = renderer.root.findByType(Router).instance;
    });

    afterEach(() => {
        act(() => renderer.unmount());
    });

    it("is null before any scene has focused", () => {
        expect(mockSceneContext.focusedRoute()).toBeNull();
    });

    it("is the route whose scene has focused, and null again once a transition starts", () => {
        const landing = {path: "/landingView"};
        router.didFocus(landing);
        expect(mockSceneContext.focusedRoute()).toBe(landing);

        router.willFocus({path: "/customDashboardView"});
        expect(mockSceneContext.focusedRoute()).toBeNull();

        const dashboards = {path: "/customDashboardView"};
        router.didFocus(dashboards);
        expect(mockSceneContext.focusedRoute()).toBe(dashboards);
    });
});
