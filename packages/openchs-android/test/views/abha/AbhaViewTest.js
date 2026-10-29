import React from "react";
import {AppState, Text, ToastAndroid} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("react-native-webview", () => ({
    WebView: (props) => require("react").createElement(require("react-native").View, {testID: "webview", ...props}),
}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
// SafeAreaProvider renders nothing until it has native insets, which swallows the whole subtree.
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));

import ServiceContext from "../../../src/framework/context/ServiceContext";
import AbhaView from "../../../src/views/abha/AbhaView";
import {ABHA_MESSAGE} from "../../../src/views/abha/AbhaHostHtml";
import General from "../../../src/utility/General";
import AbhaError from "../../../src/service/AbhaError";
import en from "../../../translations/en.json";

const EKA_KEY = "eka-access-key-7f3a";
const sessionFor = (environment) => ({accessToken: EKA_KEY, expiresAt: "2026-10-20T10:30:00Z", expiresInSeconds: 1800, environment, hipId: "hip-1"});
const ekaReply = JSON.stringify({
    response: {
        txn_id: "txn-1",
        data: {
            tokens: {sess: "patient-session-token"},
            profile: {fn: "Asha", ln: "Rao", gen: "F", dob: "1990-04-23", abha_number: "91-1234-5678-9012", "health-ids": ["asha.rao@sbx"]},
        },
    },
});

let mounted = [];

async function show(environment = "sandbox", {handBack = () => undefined} = {}) {
    const navigator = {pop: jest.fn(), getCurrentRoutes: () => []};
    const context = {getService: () => ({getI18n: () => ({t: (key) => key})}), navigator: () => navigator};
    const onProfile = jest.fn(handBack);
    const onSkip = jest.fn();
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>
            <AbhaView session={sessionFor(environment)} method="login_or_create_abha" onProfile={onProfile} onSkip={onSkip}/>
        </ServiceContext.Provider>);
    });
    mounted.push(renderer);
    const webViews = () => renderer.root.findAll((node) => node.props.testID === "webview" && typeof node.type !== "string");
    // The page this screen builds has no address of its own: the WebView reports it as about:blank.
    const sendRaw = async (data, url = "about:blank") => act(async () => webViews()[0].props.onMessage({nativeEvent: {data, url}}));
    const send = async (type, payload, url) => sendRaw(JSON.stringify({type, payload: payload === undefined ? null : payload}), url);
    const lines = () => renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join(""));
    return {navigator, onProfile, onSkip, webViews, send, sendRaw, lines};
}

// The page's script, as the WebView is given it.
async function pageFor(props) {
    const context = {getService: () => ({getI18n: () => ({t: (key) => key})}), navigator: () => ({pop: jest.fn(), getCurrentRoutes: () => []})};
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>
            <AbhaView session={sessionFor("sandbox")} method="login_or_create_abha" onProfile={jest.fn()} onSkip={jest.fn()} {...props}/>
        </ServiceContext.Provider>);
    });
    mounted.push(renderer);
    const webView = renderer.root.findAll((node) => node.props.testID === "webview" && typeof node.type !== "string")[0];
    return webView.props.source.html;
}

// An ABHA address known before Eka's screens open (a "Checked in today" patient) opens them on that address: Eka's SDK
// takes it as identifier, of identifier_type phr_address (eka-abdm plugin, abdm-m1-abha/references/web-sdk.md).
describe("AbhaView with an ABHA address to start from", () => {
    afterEach(() => {
        mounted.forEach((renderer) => act(() => renderer.unmount()));
        mounted = [];
    });

    it("hands the address to Eka's screens as a PHR address", async () => {
        const html = await pageFor({prefillAbhaAddress: "asha.rao@sbx"});
        expect(html).toContain('"identifier":"asha.rao@sbx"');
        expect(html).toContain('"identifier_type":"phr_address"');
    });

    it("hands nothing over when there is none", async () => {
        const html = await pageFor({});
        expect(html).not.toContain('"identifier"');
        expect(html).not.toContain('"identifier_type"');
    });
});

describe("AbhaViewTest", () => {
    afterEach(() => {
        mounted.forEach((renderer) => act(() => renderer.unmount()));
        mounted = [];
        jest.restoreAllMocks();
    });

    it("shows Eka's screens for the session's environment, with its key and health centre", async () => {
        const sandbox = (await show("sandbox")).webViews()[0].props;
        expect(sandbox.source.html).toContain("https://unpkg.com/@eka-care/abha-stg@0.1.126/dist/sdk/abha/js/abha.js");
        expect(sandbox.source.html).toContain(`data: {"accessToken":"${EKA_KEY}","hipId":"hip-1","skipABHAEnable":true}`);
        expect(sandbox.source.html).toContain('method: "login_or_create_abha"');
        expect((await show("production")).webViews()[0].props.source.html).toContain("https://unpkg.com/@eka-care/abha@0.2.2/dist/sdk/abha/js/abha.js");
    });

    it("keeps the WebView to https, with no file access", async () => {
        const props = (await show()).webViews()[0].props;
        expect(props.originWhitelist).toEqual(["https://*"]);
        expect(props.allowFileAccess).toBe(false);
        expect(props.allowFileAccessFromFileURLs).toBe(false);
        expect(props.allowUniversalAccessFromFileURLs).toBe(false);
    });

    it("takes messages only from the page it built, never from a page loaded into it later", async () => {
        jest.spyOn(General, "logWarn").mockImplementation(() => {});
        const screen = await show();
        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply, "https://elsewhere.example/page");
        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply, null);
        await screen.send(ABHA_MESSAGE.SKIP, null, "https://unpkg.com/x");
        expect(screen.onProfile).not.toHaveBeenCalled();
        expect(screen.onSkip).not.toHaveBeenCalled();

        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply, "null");
        expect(screen.onProfile).toHaveBeenCalledTimes(1);
    });

    it("ignores a message that is null or not an object, without failing", async () => {
        jest.spyOn(General, "logWarn").mockImplementation(() => {});
        const screen = await show();
        for (const data of ["null", "42", "\"success\"", "[1, 2]", "true"]) await screen.sendRaw(data);
        expect(screen.onProfile).not.toHaveBeenCalled();
        expect(screen.navigator.pop).not.toHaveBeenCalled();
        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply);
        expect(screen.onProfile).toHaveBeenCalledTimes(1);
    });

    it("lets only the page it built load, once, and refuses every other load", async () => {
        jest.spyOn(General, "logWarn").mockImplementation(() => {});
        const props = (await show()).webViews()[0].props;
        expect(props.onShouldStartLoadWithRequest({url: "https://elsewhere.example/"})).toBe(false);
        expect(props.onShouldStartLoadWithRequest({url: "about:blank"})).toBe(true);
        expect(props.onShouldStartLoadWithRequest({url: "about:blank"})).toBe(false);
        expect(props.onShouldStartLoadWithRequest({url: "https://unpkg.com/@eka-care/medassist-widget-embed@latest/dist/index.js"})).toBe(false);

        const loaded = (await show()).webViews()[0].props;
        act(() => loaded.onLoadEnd({nativeEvent: {url: "about:blank"}}));
        expect(loaded.onShouldStartLoadWithRequest({url: "about:blank"})).toBe(false);
    });

    it("shows an error, and no screens, for an environment it does not know", async () => {
        const screen = await show("staging");
        expect(screen.webViews()).toHaveLength(0);
        expect(screen.lines()).toContain("abhaError");
    });

    it("hands the verified profile back once, however often Eka reports it", async () => {
        const screen = await show();
        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply);
        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply);
        await screen.send(ABHA_MESSAGE.CLOSE);

        expect(screen.onProfile).toHaveBeenCalledTimes(1);
        expect(screen.onProfile.mock.calls[0][0]).toMatchObject({firstName: "Asha", lastName: "Rao", genderName: "Female",
            abhaNumber: "91-1234-5678-9012", abhaAddress: "asha.rao@sbx"});
        expect(JSON.stringify(screen.onProfile.mock.calls[0][0])).not.toContain("patient-session-token");
        expect(screen.navigator.pop).not.toHaveBeenCalled();
    });

    it("says the ABHA could not be completed when the registration cannot take the profile, and logs no detail of why", async () => {
        jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
        const warnings = [];
        jest.spyOn(General, "logWarn").mockImplementation((...args) => warnings.push(args.join(" ")));
        const failures = [
            () => Promise.reject(new Error("could not fill Asha Rao 91-1234-5678-9012")),
            () => { throw new Error("could not fill Asha Rao 91-1234-5678-9012"); },
        ];
        for (const handBack of failures) {
            ToastAndroid.show.mockClear();
            const screen = await show("sandbox", {handBack});
            await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply);
            await act(async () => { await new Promise((resolve) => setImmediate(resolve)); });
            expect(screen.onProfile).toHaveBeenCalledTimes(1);
            expect(ToastAndroid.show).toHaveBeenCalledWith("abhaError", ToastAndroid.LONG);
        }
        expect(warnings.length).toBeGreaterThan(0);
        warnings.forEach((warning) => ["Asha", "91-1234-5678-9012"].forEach((detail) => expect(warning).not.toContain(detail)));
    });

    it("says so when Eka finishes without patient details, and hands nothing back", async () => {
        const screen = await show();
        await screen.send(ABHA_MESSAGE.SUCCESS, JSON.stringify({response: {error: {message: "bad"}}}));
        expect(screen.onProfile).not.toHaveBeenCalled();
        expect(screen.lines()).toContain("abhaNoProfile");
    });

    it("hands back nothing on a skip", async () => {
        const screen = await show();
        await screen.send(ABHA_MESSAGE.SKIP);
        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply);
        expect(screen.onSkip).toHaveBeenCalledTimes(1);
        expect(screen.onSkip.mock.calls[0]).toEqual([]);
        expect(screen.onProfile).not.toHaveBeenCalled();
    });

    it("goes back when Eka's screens are closed", async () => {
        const screen = await show();
        await screen.send(ABHA_MESSAGE.CLOSE);
        expect(screen.navigator.pop).toHaveBeenCalledTimes(1);
        expect(screen.onProfile).not.toHaveBeenCalled();
        expect(screen.onSkip).not.toHaveBeenCalled();
    });

    it("logs an error inside Eka's screens by Eka's error code only, never its message, which can carry the patient's details", async () => {
        const warnings = [];
        jest.spyOn(General, "logWarn").mockImplementation((...args) => warnings.push(args.join(" ")));
        const screen = await show();
        await screen.send(ABHA_MESSAGE.ERROR, JSON.stringify({
            error: {code: "ABDM-1204", message: "Asha Rao, born 23/04/1990: Aadhaar 999988887777 is not linked to asha.rao@sbx, mobile 9000000000"},
            response: {data: {profile: {fn: "Asha", abha_number: "91-1234-5678-9012"}}},
        }));

        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain("ABDM-1204");
        ["999988887777", "asha.rao@sbx", "9000000000", "Asha", "Rao", "23/04/1990", "91-1234-5678-9012", "is not linked"].forEach((detail) =>
            expect(warnings[0]).not.toContain(detail));
        expect(screen.lines()).toContain("abhaError (ABDM-1204)");
        expect(screen.onProfile).not.toHaveBeenCalled();
    });

    it("logs a fixed line, and shows no detail, for an error that gives no code or a code that is not one", async () => {
        const warnings = [];
        jest.spyOn(General, "logWarn").mockImplementation((...args) => warnings.push(args.join(" ")));
        const screen = await show();
        const errors = [{error: "Ravi Kumar 01/02/1985 not found"}, {error: {message: "Ravi Kumar 01/02/1985"}},
            {error: {code: "91123456789012"}}, {error: {code: "Ravi Kumar"}}, "not json at all: Ravi"];
        for (const error of errors) await screen.send(ABHA_MESSAGE.ERROR, typeof error === "string" ? error : JSON.stringify(error));

        expect(warnings).toHaveLength(errors.length);
        warnings.forEach((warning) => ["Ravi", "Kumar", "01/02/1985", "91123456789012"].forEach((detail) => expect(warning).not.toContain(detail)));
        expect(screen.lines()).toContain("abhaError");
    });

    it("keyNeverLogged by the screen, whatever Eka reports", async () => {
        const logged = [];
        ["logDebug", "logInfo", "logWarn", "logError"].forEach((level) =>
            jest.spyOn(General, level).mockImplementation((...args) => logged.push(args)));
        jest.spyOn(General, "isDebugEnabled").mockReturnValue(true);
        const screen = await show();
        await screen.send(ABHA_MESSAGE.ERROR, JSON.stringify({error: "bad"}));
        await screen.send("not-a-message-type");
        await act(async () => screen.webViews()[0].props.onMessage({nativeEvent: {data: "not json"}}));
        await screen.send(ABHA_MESSAGE.SUCCESS, ekaReply);

        logged.forEach((args) => args.forEach((arg) =>
            expect(typeof arg === "string" ? arg : JSON.stringify(arg) || "").not.toContain(EKA_KEY)));
    });

    it("has English wording for every message the screen and the server's refusals show", () => {
        const refusals = ["ABHA_NOT_CONFIGURED", "ABHA_NO_HEALTH_CENTRE", "ABHA_NO_PRIVILEGE", "ABHA_DISABLED", null]
            .map((code) => AbhaError.messageKey(new AbhaError(code, 403)));
        [...refusals, "abhaTitle", "abhaFindOrCreate", "abhaNeedsInternet", "abhaError", "abhaNoProfile", "abhaSessionEnded"].forEach((key) =>
            expect([key, typeof en.translations[key]]).toEqual([key, "string"]));
    });
});

describe("AbhaView ending before its key expires", () => {
    const MINUTE = 60 * 1000;
    let rendered = [];

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        rendered.forEach((renderer) => act(() => renderer.unmount()));
        rendered = [];
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    function mount(expiresInSeconds, {onProfile = jest.fn()} = {}) {
        const navigator = {pop: jest.fn(), getCurrentRoutes: () => []};
        const context = {getService: () => ({getI18n: () => ({t: (key) => key})}), navigator: () => navigator};
        const session = {...sessionFor("sandbox"), expiresInSeconds};
        let renderer;
        act(() => {
            renderer = TestRenderer.create(<ServiceContext.Provider value={context}>
                <AbhaView session={session} method="login_or_create_abha" onProfile={onProfile} onSkip={jest.fn()}/>
            </ServiceContext.Provider>);
        });
        rendered.push(renderer);
        const webViews = () => renderer.root.findAll((node) => node.props.testID === "webview" && typeof node.type !== "string");
        const lines = () => renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join(""));
        return {renderer, webViews, lines};
    }

    it("ends the screens a minute before the key expires, and says so", () => {
        const screen = mount(300);
        act(() => jest.advanceTimersByTime(4 * MINUTE - 1000));
        expect(screen.webViews().length).toBe(1);

        act(() => jest.advanceTimersByTime(2000));

        expect(screen.webViews().length).toBe(0);
        expect(screen.lines()).toContain("abhaSessionEnded");
    });

    it("ends at once for a key with a minute or less left", () => {
        const screen = mount(60);
        act(() => jest.advanceTimersByTime(0));

        expect(screen.webViews().length).toBe(0);
        expect(screen.lines()).toContain("abhaSessionEnded");
    });

    it("keeps the screens open when the session gives no lifetime or an unreadable one", () => {
        const noLifetime = mount(undefined);
        const unreadable = mount("soon");

        act(() => jest.advanceTimersByTime(60 * MINUTE));

        expect(noLifetime.webViews().length).toBe(1);
        expect(unreadable.webViews().length).toBe(1);
    });

    it("does not end a screen whose result was already handed back", async () => {
        const screen = mount(300);
        await act(async () => screen.webViews()[0].props.onMessage({nativeEvent: {url: "about:blank",
            data: JSON.stringify({type: ABHA_MESSAGE.SUCCESS, payload: ekaReply})}}));

        act(() => jest.advanceTimersByTime(10 * MINUTE));

        expect(screen.lines()).not.toContain("abhaSessionEnded");
    });

    function resumeHandler() {
        const handlers = [];
        const remove = jest.fn();
        jest.spyOn(AppState, "addEventListener").mockImplementation((type, handler) => {
            if (type === "change") handlers.push(handler);
            return {remove};
        });
        return {resume: () => act(() => handlers.forEach((h) => h("active"))), remove};
    }

    it("ends the screens on coming back from sleep when the key has run out meanwhile", () => {
        const app = resumeHandler();
        const screen = mount(300);

        jest.setSystemTime(Date.now() + 5 * MINUTE);
        app.resume();

        expect(screen.webViews().length).toBe(0);
        expect(screen.lines()).toContain("abhaSessionEnded");
    });

    it("keeps the screens on coming back while the key still has more than a minute", () => {
        const app = resumeHandler();
        const screen = mount(300);

        jest.setSystemTime(Date.now() + 2 * MINUTE);
        app.resume();

        expect(screen.webViews().length).toBe(1);
    });

    it("stops listening for the app coming back when the screen closes", () => {
        const app = resumeHandler();
        const screen = mount(300);

        act(() => screen.renderer.unmount());
        rendered = rendered.filter((r) => r !== screen.renderer);

        expect(app.remove).toHaveBeenCalled();
    });

    it("stops its timer when the screen closes", () => {
        const before = jest.getTimerCount();
        const screen = mount(300);
        expect(jest.getTimerCount()).toBeGreaterThan(before);

        act(() => screen.renderer.unmount());
        rendered = rendered.filter((r) => r !== screen.renderer);

        expect(jest.getTimerCount()).toBe(before);
    });
});
