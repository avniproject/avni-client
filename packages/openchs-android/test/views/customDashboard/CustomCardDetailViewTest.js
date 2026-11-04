// The card page: what it hands the WebView, which messages it accepts, and how it reloads after a command opened a screen.
import React from "react";
import {ToastAndroid} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));
jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/common/CHSContainer", () => ({__esModule: true, default: ({children}) => children}));
// Captures the props the card page gives the WebView.
jest.mock("react-native-webview", () => ({WebView: (props) => {
    global.__webViewProps = props;
    return null;
}}));
// Importing the config service reaches the Bugsnag setup, which warns when the native part is absent.
jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../../src/framework/errorHandling/ErrorUtil", () => ({__esModule: true, default: {notifyBugsnag: jest.fn()}}));

import {WebView} from "react-native-webview";
import CustomCardDetailView from "../../../src/views/customDashboard/CustomCardDetailView";
import {buildCustomCardPageScript, PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/CustomCardPageScript";
import CustomCardConfigService from "../../../src/service/CustomCardConfigService";
import RuleEvaluationService from "../../../src/service/RuleEvaluationService";
import CustomCardCommandService from "../../../src/service/customDashboard/CustomCardCommandService";
import MessageService from "../../../src/service/MessageService";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import ErrorUtil from "../../../src/framework/errorHandling/ErrorUtil";
import General from "../../../src/utility/General";

const i18n = {t: (key) => `i18n:${key}`};
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// The token of the card page mounted last, which that page's script puts on every command.
let pageToken;
const flush = async () => {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
};

const mount = ({executeCustomCardDataRule = jest.fn(() => ({data: {n: 1}})), props = {}} = {}) => {
    const readHtmlTemplate = jest.fn(() => Promise.resolve("<p>${data.n}</p>"));
    const dispatch = jest.fn(() => true);
    const services = new Map([
        [CustomCardConfigService, {readHtmlTemplate, resolveTranslations: () => ({})}],
        [RuleEvaluationService, {executeCustomCardDataRule}],
        [CustomCardCommandService, {dispatch}],
        [MessageService, {getI18n: () => i18n}],
    ]);
    // The route in front, as the Router's focusedRoute gives it: the card page, unless a test says otherwise.
    let focused = {path: "/customCardDetailView"};
    const context = {
        getService: (Class) => {
            if (!services.has(Class)) throw new Error(`unexpected service ${Class && Class.name}`);
            return services.get(Class);
        },
        getStore: () => ({getState: () => ({}), subscribe: () => () => {}, dispatch: () => {}}),
        navigator: () => ({push: jest.fn(), getCurrentRoutes: () => []}),
        focusedRoute: () => focused,
    };
    let tr;
    act(() => {
        tr = TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <CustomCardDetailView customCardConfig={{}} reportCard={{name: "Card"}} ruleInputArray={[]} {...props}/>
            </ServiceContext.Provider>,
        );
    });
    const instance = tr.root.findByType(CustomCardDetailView).instance;
    pageToken = instance._pageToken;
    const setFocusedRoute = (route) => {
        focused = route;
    };
    return {tr, instance, readHtmlTemplate, executeCustomCardDataRule, dispatch, setFocusedRoute};
};

const message = (data, url = "about:blank") => ({nativeEvent: {data, url}});
const command = (name = "ping", args = {a: 1}, token = pageToken) => JSON.stringify({avniCommand: name, args, token});
const send = (event) => global.__webViewProps.onMessage(event);
// The page object the view gave the command service on its last dispatch.
const pageOf = (dispatch) => dispatch.mock.calls[dispatch.mock.calls.length - 1][1];

let frames = null;
const runFrames = () => {
    const due = frames.splice(0);
    due.forEach((callback) => callback());
};

describe("CustomCardDetailView", () => {
    beforeEach(() => {
        global.__webViewProps = undefined;
        // Frames run at once, unless a test collects them in `frames` to run them itself.
        frames = null;
        global.requestAnimationFrame = (callback) => (frames ? frames.push(callback) : callback());
        ErrorUtil.notifyBugsnag.mockClear();
    });
    afterEach(() => jest.restoreAllMocks());

    it("gives the page its own avni script, with this page's token, and a message handler", async () => {
        const {instance} = mount();
        await flush();
        expect(instance._pageToken).toMatch(UUID_SHAPE);
        expect(global.__webViewProps.injectedJavaScriptBeforeContentLoaded).toBe(buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, instance._pageToken));
        expect(typeof global.__webViewProps.onMessage).toBe("function");
    });

    // A frame inside the card's page reads as the page itself, and the page's own script can post to the bridge without
    // the touch check. Neither knows the token, which only the app's script holds.
    it("takes a command only with this page's token", async () => {
        const {dispatch} = mount();
        await flush();
        const logDebug = jest.spyOn(General, "logDebug").mockImplementation(() => {});
        send(message(command("ping", {a: 1}, "6f1c2a7e-0b9d-4c55-9a3e-2d8f4b1e7c90")));
        send(message(JSON.stringify({avniCommand: "ping", args: {a: 1}})));
        send(message(command("ping", {a: 1}, null)));
        expect(dispatch).not.toHaveBeenCalled();
        expect(logDebug.mock.calls.filter(([, line]) => String(line).includes("this page's token"))).toHaveLength(3);
        send(message(command()));
        expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it("the script the WebView runs sends commands this page takes, and a post to the bridge without it is dropped", async () => {
        const {dispatch} = mount();
        await flush();
        // The page as the WebView runs it, touched by its user.
        const listeners = [];
        const posted = [];
        const window = {ReactNativeWebView: {postMessage: (m) => posted.push(m)}};
        new Function("window", "document", "console", global.__webViewProps.injectedJavaScriptBeforeContentLoaded)(
            window, {addEventListener: (type, fn) => listeners.push({type, fn})}, {warn: () => {}});
        listeners.filter((l) => l.type === "touchstart").forEach((l) => l.fn({type: "touchstart"}));
        window.avni.runCardAction({locationUUID: "abc"});
        // The page's own script, or a frame inside it, posting to the bridge itself.
        window.ReactNativeWebView.postMessage(JSON.stringify({avniCommand: "runCardAction", args: {locationUUID: "abc"}}));
        expect(posted).toHaveLength(2);
        posted.forEach((data) => send(message(data, "null")));
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch.mock.calls[0][0]).toEqual({avniCommand: "runCardAction", args: {locationUUID: "abc"}, token: pageToken});
    });

    it("two card pages get different tokens, and neither takes the other's commands", async () => {
        const a = mount();
        await flush();
        const scriptA = global.__webViewProps.injectedJavaScriptBeforeContentLoaded;
        const b = mount();
        await flush();
        const scriptB = global.__webViewProps.injectedJavaScriptBeforeContentLoaded;
        expect(a.instance._pageToken).toMatch(UUID_SHAPE);
        expect(b.instance._pageToken).toMatch(UUID_SHAPE);
        expect(a.instance._pageToken).not.toBe(b.instance._pageToken);
        expect(scriptA).not.toBe(scriptB);
        b.instance.onMessage(message(command("ping", {a: 1}, a.instance._pageToken)));
        expect(b.dispatch).not.toHaveBeenCalled();
        a.instance.onMessage(message(command("ping", {a: 1}, a.instance._pageToken)));
        expect(a.dispatch).toHaveBeenCalledTimes(1);
    });

    // A refresh with the same html does not reload the page, which keeps the token its script was given.
    it("keeps its token and its script across a refresh", async () => {
        const {dispatch, instance} = mount();
        await flush();
        const script = global.__webViewProps.injectedJavaScriptBeforeContentLoaded;
        const token = instance._pageToken;
        send(message(command()));
        pageOf(dispatch).navigate(() => {});
        instance.didFocus();
        await flush();
        expect(instance._pageToken).toBe(token);
        expect(global.__webViewProps.injectedJavaScriptBeforeContentLoaded).toBe(script);
        send(message(command("ping", {a: 1}, token)));
        expect(dispatch).toHaveBeenCalledTimes(2);
    });

    it("a page that calls no command runs its rule once", async () => {
        const {instance, executeCustomCardDataRule} = mount();
        await flush();
        instance.didFocus();
        await flush();
        expect(executeCustomCardDataRule).toHaveBeenCalledTimes(1);
    });

    it("ignores a message that is not a command", async () => {
        const {dispatch} = mount();
        await flush();
        ["not json", "[1]", "null", "{}", '{"avniCommand":5}', '"ping"'].forEach((data) => send(message(data)));
        expect(dispatch).not.toHaveBeenCalled();
    });

    it("ignores a message from another page", async () => {
        const {dispatch} = mount();
        await flush();
        send(message(command(), "https://example.com"));
        expect(dispatch).not.toHaveBeenCalled();
    });

    // On the fallback bridge the url is the page's own, and after a link with href="#" it carries a fragment.
    it("accepts the page's own url with a fragment, and no url of another page", async () => {
        const {dispatch} = mount();
        await flush();
        ["about:blank#", "about:blank#top"].forEach((url) => send(message(command(), url)));
        expect(dispatch).toHaveBeenCalledTimes(2);
        dispatch.mockClear();
        ["https://example.org", "https://example.org/page?x=1", "data:text/html,<p>x</p>", "file:///sdcard/x.html", "about:blankx"]
            .forEach((url) => send(message(command(), url)));
        expect(dispatch).not.toHaveBeenCalled();
    });

    it("hands a command to the command service with the page", async () => {
        const {dispatch, instance} = mount();
        await flush();
        send(message(command()));
        expect(dispatch).toHaveBeenCalledTimes(1);
        const [sent, page] = dispatch.mock.calls[0];
        expect(sent).toEqual({avniCommand: "ping", args: {a: 1}, token: pageToken});
        expect(page.view).toBe(instance);
        expect(page.reportCard).toEqual({name: "Card"});
        expect(typeof page.showMessage).toBe("function");
        expect(typeof page.navigate).toBe("function");
        // The card's own page reports "null" (the message listener bridge), about:blank or an empty url (the fallback bridge), or none.
        [message(command(), "null"), message(command(), ""), {nativeEvent: {data: command(), url: null}}, {nativeEvent: {data: command()}}].forEach(send);
        expect(dispatch).toHaveBeenCalledTimes(5);
    });

    it("a command that throws is reported, the user is told, and the page stays", async () => {
        const {dispatch, tr} = mount();
        await flush();
        const error = new Error("boom");
        dispatch.mockImplementation(() => {
            throw error;
        });
        const logError = jest.spyOn(General, "logError").mockImplementation(() => {});
        const show = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
        expect(() => send(message(command()))).not.toThrow();
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith("CustomCardDetailView", error);
        expect(ErrorUtil.notifyBugsnag).toHaveBeenCalledTimes(1);
        expect(ErrorUtil.notifyBugsnag).toHaveBeenCalledWith(error, "CustomCardDetailView");
        expect(show).toHaveBeenCalledTimes(1);
        expect(show).toHaveBeenCalledWith("i18n:unknownError", ToastAndroid.SHORT);
        expect(tr.root.findByType(CustomCardDetailView)).toBeTruthy();
    });

    it("shows a message as a short toast and stays", async () => {
        const {dispatch, tr} = mount();
        await flush();
        const show = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
        send(message(command()));
        pageOf(dispatch).showMessage("recordNotOnThisPhone");
        expect(show).toHaveBeenCalledWith("i18n:recordNotOnThisPhone", ToastAndroid.SHORT);
        expect(tr.root.findByType(CustomCardDetailView)).toBeTruthy();
    });

    it("runs the navigation from the card page and marks it", async () => {
        const {dispatch, instance} = mount();
        await flush();
        send(message(command()));
        const navigateFrom = jest.fn();
        expect(pageOf(dispatch).navigate(navigateFrom)).toBe(true);
        expect(navigateFrom).toHaveBeenCalledWith(instance);
        expect(instance._commandNavigated).toBe(true);
    });

    it("a navigation that throws leaves commands open", async () => {
        const {dispatch, instance} = mount();
        await flush();
        send(message(command()));
        const page = pageOf(dispatch);
        expect(() => page.navigate(() => {
            throw new Error("no screen");
        })).toThrow("no screen");
        expect(instance._commandNavigated).toBeFalsy();
        const next = jest.fn();
        expect(page.navigate(next)).toBe(true);
        expect(next).toHaveBeenCalled();
    });

    it("the page carries the source dashboard and opens through the callback", async () => {
        const onOpenDashboard = jest.fn();
        const {dispatch, instance} = mount({props: {sourceDashboardUUID: "d2", onOpenDashboard}});
        await flush();
        send(message(command()));
        const page = pageOf(dispatch);
        expect(page.sourceDashboardUUID).toBe("d2");
        expect(page.openDashboard("t1")).toBe(true);
        expect(onOpenDashboard).toHaveBeenCalledTimes(1);
        expect(onOpenDashboard).toHaveBeenCalledWith(instance, "t1");
        expect(instance._commandNavigated).toBe(true);
    });

    it("without the open callback, opening does nothing and does not crash", async () => {
        const {dispatch, instance} = mount();
        await flush();
        send(message(command()));
        const beforeOpen = jest.fn();
        expect(pageOf(dispatch).openDashboard("t1", beforeOpen)).toBe(false);
        expect(beforeOpen).not.toHaveBeenCalled();
        expect(instance._commandNavigated).toBeFalsy();
    });

    it("beforeOpen runs only when the screen opens, before it opens", async () => {
        const order = [];
        const onOpenDashboard = jest.fn(() => order.push("open"));
        const {dispatch} = mount({props: {onOpenDashboard}});
        await flush();
        send(message(command()));
        const page = pageOf(dispatch);
        const beforeOpen = jest.fn(() => order.push("carry"));
        expect(page.openDashboard("t1", beforeOpen)).toBe(true);
        expect(order).toEqual(["carry", "open"]);
        // A second tap while the first screen opens runs neither.
        expect(page.openDashboard("t1", beforeOpen)).toBe(false);
        expect(order).toEqual(["carry", "open"]);
    });

    it("a carry that throws leaves commands open", async () => {
        const onOpenDashboard = jest.fn();
        const {dispatch, instance} = mount({props: {onOpenDashboard}});
        await flush();
        send(message(command()));
        const page = pageOf(dispatch);
        expect(() => page.openDashboard("t1", () => {
            throw new Error("carry failed");
        })).toThrow("carry failed");
        expect(onOpenDashboard).not.toHaveBeenCalled();
        expect(instance._commandNavigated).toBeFalsy();
        expect(page.openDashboard("t1")).toBe(true);
        expect(onOpenDashboard).toHaveBeenCalledTimes(1);
    });

    it("runs the rule again once after a command navigated", async () => {
        const {dispatch, instance, executeCustomCardDataRule} = mount();
        await flush();
        send(message(command()));
        pageOf(dispatch).navigate(() => {});
        instance.didFocus();
        await flush();
        expect(executeCustomCardDataRule).toHaveBeenCalledTimes(2);
        instance.didFocus();
        await flush();
        expect(executeCustomCardDataRule).toHaveBeenCalledTimes(2);
    });

    it("drops a second command while the first one's screen is opening", async () => {
        const {dispatch} = mount();
        await flush();
        send(message(command()));
        const first = jest.fn();
        const second = jest.fn();
        const page = pageOf(dispatch);
        expect(page.navigate(first)).toBe(true);
        expect(page.navigate(second)).toBe(false);
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).not.toHaveBeenCalled();
    });

    // A tap during a slide, such as the back slide away from the card page, would push onto a stack in motion and
    // crash the app. No route is in front from the start of a slide to its end.
    it("drops a command while the card page is not the screen in front, and takes the next one once it is", async () => {
        const logDebug = jest.spyOn(General, "logDebug").mockImplementation(() => {});
        for (const notInFront of [null, {path: "/someOtherView"}]) {
            const onOpenDashboard = jest.fn();
            const {dispatch, instance, tr, setFocusedRoute} = mount({props: {onOpenDashboard}});
            await flush();
            send(message(command()));
            const page = pageOf(dispatch);
            logDebug.mockClear();
            setFocusedRoute(notInFront);

            const navigateFrom = jest.fn();
            expect(page.navigate(navigateFrom)).toBe(false);
            const beforeOpen = jest.fn();
            expect(page.openDashboard("t1", beforeOpen)).toBe(false);
            expect(navigateFrom).not.toHaveBeenCalled();
            expect(beforeOpen).not.toHaveBeenCalled();
            expect(onOpenDashboard).not.toHaveBeenCalled();
            expect(instance._commandNavigated).toBe(false);
            expect(logDebug).toHaveBeenCalledWith("CustomCardDetailView", expect.stringContaining("the card page is not the screen in front"));

            setFocusedRoute({path: "/customCardDetailView"});
            const next = jest.fn();
            expect(page.navigate(next)).toBe(true);
            expect(next).toHaveBeenCalledWith(instance);
            expect(instance._commandNavigated).toBe(true);
            act(() => tr.unmount());
        }
    });

    // A second tap during a slow first command, or a tap during a slide, would run the command's lookups for nothing
    // before navigate refused.
    it("hands no command on while an earlier one has opened a screen, or while the card page is not in front", async () => {
        const {dispatch, instance, setFocusedRoute} = mount();
        await flush();
        const logDebug = jest.spyOn(General, "logDebug").mockImplementation(() => {});
        const dropped = (reason) => logDebug.mock.calls.filter(([, line]) => String(line).includes(reason));
        send(message(command()));
        expect(dispatch).toHaveBeenCalledTimes(1);
        pageOf(dispatch).navigate(() => {});

        // The first command has opened a screen.
        send(message(command()));
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dropped("an earlier command has opened a screen")).toHaveLength(1);

        // The user comes back, and the card page's didFocus clears the mark. A slide then starts, or another screen is in front.
        instance.didFocus();
        await flush();
        setFocusedRoute(null);
        send(message(command()));
        setFocusedRoute({path: "/someOtherView"});
        send(message(command()));
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dropped("the card page is not the screen in front")).toHaveLength(2);

        // In front again, with the mark cleared.
        setFocusedRoute({path: "/customCardDetailView"});
        send(message(command()));
        expect(dispatch).toHaveBeenCalledTimes(2);
    });

    it("defers the reload past the back slide", async () => {
        const {dispatch, instance, executeCustomCardDataRule} = mount();
        await flush();
        send(message(command()));
        pageOf(dispatch).navigate(() => {});
        frames = [];
        instance.didFocus();
        await flush();
        expect(executeCustomCardDataRule).toHaveBeenCalledTimes(1);
        runFrames();
        await flush();
        expect(executeCustomCardDataRule).toHaveBeenCalledTimes(1);
        runFrames();
        await flush();
        expect(executeCustomCardDataRule).toHaveBeenCalledTimes(2);
    });

    it("a good reload clears an earlier error", async () => {
        const executeCustomCardDataRule = jest.fn()
            .mockImplementationOnce(() => ({hasErrorMsg: true, errorMsg: "rule failed"}))
            .mockImplementation(() => ({data: {n: 1}}));
        const {instance, tr} = mount({executeCustomCardDataRule});
        await flush();
        expect(JSON.stringify(tr.toJSON())).toContain("rule failed");
        instance._commandNavigated = true;
        instance.didFocus();
        await flush();
        expect(JSON.stringify(tr.toJSON())).not.toContain("rule failed");
    });

    // The earlier page's counts would read as current under the error.
    it("a reload that fails takes the earlier page away and shows the error", async () => {
        jest.spyOn(General, "logError").mockImplementation(() => {});
        const failures = [
            [() => ({hasErrorMsg: true, errorMsg: "rule failed"}), "rule failed"],
            [() => {
                throw new Error("rule threw");
            }, "rule threw"],
        ];
        for (const [failure, error] of failures) {
            const executeCustomCardDataRule = jest.fn()
                .mockImplementationOnce(() => ({data: {n: 1}}))
                .mockImplementation(failure);
            const {instance, tr} = mount({executeCustomCardDataRule});
            await flush();
            expect(instance.state.html).toBe("<p>1</p>");
            expect(tr.root.findAllByType(WebView)).toHaveLength(1);
            instance._commandNavigated = true;
            instance.didFocus();
            await flush();
            expect(executeCustomCardDataRule).toHaveBeenCalledTimes(2);
            expect(instance.state.html).toBeNull();
            expect(instance.state.error).toBe(error);
            expect(tr.root.findAllByType(WebView)).toHaveLength(0);
            act(() => tr.unmount());
        }
    });

    it("takes commands again after the user comes back", async () => {
        const {dispatch, instance} = mount();
        await flush();
        send(message(command()));
        const page = pageOf(dispatch);
        page.navigate(() => {});
        instance.didFocus();
        await flush();
        const again = jest.fn();
        expect(page.navigate(again)).toBe(true);
        expect(again).toHaveBeenCalled();
    });

    it("does not set state after unmount while a reload runs", async () => {
        const {dispatch, instance, tr, readHtmlTemplate} = mount();
        await flush();
        send(message(command()));
        pageOf(dispatch).navigate(() => {});
        let release;
        readHtmlTemplate.mockImplementation(() => new Promise((resolve) => {
            release = resolve;
        }));
        instance.didFocus();
        const setState = jest.spyOn(instance, "setState");
        act(() => tr.unmount());
        await act(async () => {
            release("<p>late</p>");
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(setState).not.toHaveBeenCalled();
    });
});
