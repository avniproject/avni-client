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

import CustomCardDetailView from "../../../src/views/customDashboard/CustomCardDetailView";
import {CUSTOM_CARD_PAGE_SCRIPT} from "../../../src/views/customDashboard/CustomCardPageScript";
import CustomCardConfigService from "../../../src/service/CustomCardConfigService";
import RuleEvaluationService from "../../../src/service/RuleEvaluationService";
import CustomCardCommandService from "../../../src/service/customDashboard/CustomCardCommandService";
import MessageService from "../../../src/service/MessageService";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import ErrorUtil from "../../../src/framework/errorHandling/ErrorUtil";
import General from "../../../src/utility/General";

const i18n = {t: (key) => `i18n:${key}`};
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
    const context = {
        getService: (Class) => {
            if (!services.has(Class)) throw new Error(`unexpected service ${Class && Class.name}`);
            return services.get(Class);
        },
        getStore: () => ({getState: () => ({}), subscribe: () => () => {}, dispatch: () => {}}),
        navigator: () => ({push: jest.fn(), getCurrentRoutes: () => []}),
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
    return {tr, instance, readHtmlTemplate, executeCustomCardDataRule, dispatch};
};

const message = (data, url = "about:blank") => ({nativeEvent: {data, url}});
const command = (name = "ping", args = {a: 1}) => JSON.stringify({avniCommand: name, args});
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

    it("gives the page the avni script and a message handler", async () => {
        mount();
        await flush();
        expect(global.__webViewProps.injectedJavaScriptBeforeContentLoaded).toBe(CUSTOM_CARD_PAGE_SCRIPT);
        expect(typeof global.__webViewProps.onMessage).toBe("function");
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

    it("hands a command to the command service with the page", async () => {
        const {dispatch, instance} = mount();
        await flush();
        send(message(command()));
        expect(dispatch).toHaveBeenCalledTimes(1);
        const [sent, page] = dispatch.mock.calls[0];
        expect(sent).toEqual({avniCommand: "ping", args: {a: 1}});
        expect(page.view).toBe(instance);
        expect(page.reportCard).toEqual({name: "Card"});
        expect(typeof page.showMessage).toBe("function");
        expect(typeof page.navigate).toBe("function");
        // The card's own page reports "null" (the message listener bridge), about:blank or an empty url (the fallback bridge), or none.
        [message(command(), "null"), message(command(), ""), {nativeEvent: {data: command(), url: null}}, {nativeEvent: {data: command()}}].forEach(send);
        expect(dispatch).toHaveBeenCalledTimes(5);
    });

    it("a command that throws is reported and the page stays", async () => {
        const {dispatch, tr} = mount();
        await flush();
        const error = new Error("boom");
        dispatch.mockImplementation(() => {
            throw error;
        });
        const logError = jest.spyOn(General, "logError").mockImplementation(() => {});
        expect(() => send(message(command()))).not.toThrow();
        expect(logError).toHaveBeenCalledWith("CustomCardDetailView", error);
        expect(ErrorUtil.notifyBugsnag).toHaveBeenCalledWith(error, "CustomCardDetailView");
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
