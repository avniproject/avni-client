// The page of a Custom Design Card, shared by the card's own screen and a full-page dashboard: what it shows for each
// state, which messages it hands on, the page handle its host gives commands, and the check for a save since a command.
import React from "react";
import {Text, TouchableOpacity} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("../../../src/utility/Analytics", () => ({
    __esModule: true,
    screenRenderStart: () => 0,
    logScreenEvent: () => {},
}));
jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-webview", () => ({WebView: (props) => {
    global.__webViewProps = props;
    return null;
}}));
jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../../src/framework/errorHandling/ErrorUtil", () => ({__esModule: true, default: {notifyBugsnag: jest.fn()}}));

import {WebView} from "react-native-webview";
import CustomCardPage, {cardPageHandle, savedSince, SAVED_SINCE_QUERY} from "../../../src/views/customDashboard/CustomCardPage";
import {buildCustomCardPageScript, PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/CustomCardPageScript";
import CustomCardCommandService from "../../../src/service/customDashboard/CustomCardCommandService";
import EntityQueueService from "../../../src/service/EntityQueueService";
import MessageService from "../../../src/service/MessageService";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import RealmQueryParser from "../../../src/framework/db/RealmQueryParser";
import General from "../../../src/utility/General";

const i18n = {t: (key) => `i18n:${key}`};

const mount = (props = {}) => {
    const dispatch = jest.fn();
    const context = {
        getService: (Class) => new Map([[MessageService, {getI18n: () => i18n}], [CustomCardCommandService, {dispatch}]]).get(Class),
    };
    const page = jest.fn(() => ({name: "handle"}));
    const all = {html: "<p>1</p>", logTag: "Host", dropReason: () => null, page, ...props};
    let tr;
    act(() => {
        tr = TestRenderer.create(<ServiceContext.Provider value={context}><CustomCardPage {...all}/></ServiceContext.Provider>);
    });
    const update = (next) => act(() => tr.update(<ServiceContext.Provider value={context}><CustomCardPage {...all} {...next}/></ServiceContext.Provider>));
    return {tr, instance: tr.root.findByType(CustomCardPage).instance, dispatch, page, update};
};
const texts = (tr) => tr.root.findAllByType(Text).map((t) => t.props.children);
const command = (token, name = "ping") => ({nativeEvent: {url: "null", data: JSON.stringify({avniCommand: name, args: {}, token})}});

describe("CustomCardPage", () => {
    beforeEach(() => {
        global.__webViewProps = undefined;
    });
    afterEach(() => jest.restoreAllMocks());

    it("gives the WebView the page with the script and its token first, and its message handler", () => {
        const {instance} = mount();
        const script = buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, instance._pageToken);
        expect(global.__webViewProps.source).toEqual({html: `<script>${script}</script><p>1</p>`});
        // Android may run an injected script after the page's own, so the script is in the page instead.
        expect(global.__webViewProps.injectedJavaScriptBeforeContentLoaded).toBeUndefined();
        expect(global.__webViewProps.onMessage).toBe(instance.onMessage);
    });

    it("tells the page's script whether a screen reader is on, and follows a change", async () => {
        const {AccessibilityInfo} = require("react-native");
        let changed;
        AccessibilityInfo.isScreenReaderEnabled.mockImplementation(() => Promise.resolve(true));
        AccessibilityInfo.addEventListener.mockImplementation((name, fn) => {
            if (name === "screenReaderChanged") changed = fn;
            return {remove: jest.fn()};
        });
        const {instance, tr} = mount();
        const scriptFor = (on) => `<script>${buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, instance._pageToken, on)}</script>`;
        expect(global.__webViewProps.source.html.startsWith(scriptFor(false))).toBe(true);
        await act(async () => {});
        expect(global.__webViewProps.source.html.startsWith(scriptFor(true))).toBe(true);
        act(() => changed(false));
        expect(global.__webViewProps.source.html.startsWith(scriptFor(false))).toBe(true);
        act(() => tr.unmount());
        AccessibilityInfo.isScreenReaderEnabled.mockImplementation(() => Promise.resolve(false));
    });

    // Android keeps the scroll offset when the WebView's html changes. Another dashboard's page opens at the top; the
    // same dashboard's new page keeps the offset and swaps without a blank frame.
    it("keeps the WebView for a new page of the same dashboard, and makes a new one for another dashboard", () => {
        const {tr, update} = mount({pageKey: "d1"});
        const first = tr.root.findByType(WebView);
        update({pageKey: "d1", html: "<p>2</p>"});
        expect(tr.root.findByType(WebView)).toBe(first);
        update({pageKey: "d2", html: "<p>3</p>"});
        expect(tr.root.findByType(WebView)).not.toBe(first);
    });

    it("puts the script after a leading doctype, otherwise first, so the page's own scripts find avni as they load", () => {
        const pageScript = "<script>window.seen = typeof window.avni !== 'undefined' && typeof window.avni.runCardAction === 'function';</script>";
        const cases = [
            // [page, the part the script goes after]
            [`<!DOCTYPE html><html lang="en"><head><title>t</title>${pageScript}</head><body></body></html>`, "<!DOCTYPE html>"],
            [`\uFEFF  <!-- made by a tool --> <!doctype html><html><head>${pageScript}</head></html>`, "\uFEFF  <!-- made by a tool --> <!doctype html>"],
            [`<!-- <head> --><html lang="en"><HEAD>${pageScript}</HEAD></html>`, ""],
            [`<html><body><script>var a = "<head>";</script>${pageScript}</body></html>`, ""],
            [`<p>no head</p>${pageScript}`, ""],
        ];
        cases.forEach(([html, before]) => {
            const {instance} = mount({html});
            const tag = `<script>${buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, instance._pageToken)}</script>`;
            expect(global.__webViewProps.source.html).toBe(before + tag + html.slice(before.length));
            // The page's scripts, run in the order the page holds them.
            const window = {ReactNativeWebView: {postMessage: () => {}}};
            const document = {addEventListener: () => {}};
            [...global.__webViewProps.source.html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
                .forEach(([, body]) => new Function("window", "document", "console", body)(window, document, {warn: () => {}}));
            expect(window.seen).toBe(true);
        });
    });

    it("hands a command to the command service with the host's handle, named by the command", () => {
        const {instance, dispatch, page} = mount();
        instance.onMessage(command(instance._pageToken, "editVisit"));
        expect(page).toHaveBeenCalledWith("editVisit");
        expect(dispatch).toHaveBeenCalledWith({avniCommand: "editVisit", args: {}, token: instance._pageToken}, {name: "handle"});
    });

    it("drops a command the host gives a reason for, logged under the host's tag", () => {
        const logDebug = jest.spyOn(General, "logDebug").mockImplementation(() => {});
        const {instance, dispatch} = mount({dropReason: () => "the page is not the screen in front"});
        instance.onMessage(command(instance._pageToken));
        expect(dispatch).not.toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith("Host", "A command is dropped: the page is not the screen in front");
    });

    it("keeps its token when the page changes", () => {
        const {instance, update} = mount();
        const token = instance._pageToken;
        update({html: "<p>2</p>"});
        expect(instance._pageToken).toBe(token);
        expect(global.__webViewProps.source.html).toMatch(/<\/script><p>2<\/p>$/);
    });

    it("shows an error in place of the page", () => {
        const {tr} = mount({html: null, error: "rule failed"});
        expect(texts(tr)).toContain("rule failed");
        expect(tr.root.findAllByType(WebView)).toHaveLength(0);
    });

    it("shows a loading mark while the first page is calculated", () => {
        const {tr} = mount({html: null, updating: true});
        expect(texts(tr)).toContain("i18n:customCardPageLoading");
        expect(tr.root.findAllByType(WebView)).toHaveLength(0);
    });

    it("keeps the last page with an Updating mark that takes no touches while a new one is calculated", () => {
        const {tr} = mount({updating: true});
        expect(tr.root.findAllByType(WebView)).toHaveLength(1);
        const mark = tr.root.findAll((node) => node.props.accessibilityLiveRegion === "polite" && node.props.pointerEvents === "none");
        expect(mark.length).toBeGreaterThan(0);
        expect(mark[0].props.accessibilityLabel).toBe("i18n:customCardPageUpdating");
    });

    // A strip in the column would push the page down and back on every recalculation.
    it("draws the Updating mark as a thin bar on the page's top edge, so the page does not move", () => {
        const {tr, update} = mount({updating: false});
        const holder = () => tr.root.findByType(WebView).parent;
        const before = holder();
        update({updating: true});
        expect(holder()).toBe(before);
        const mark = tr.root.findAll((node) => node.props.accessibilityLiveRegion === "polite")[0];
        expect(mark.props.style).toEqual(expect.objectContaining({position: "absolute", top: 0, left: 0, right: 0}));
        expect(mark.props.style.height).toBeLessThanOrEqual(4);
    });

    it("a page held after a run the app did not finish shows a Load page button, and no page", () => {
        const onLoadPage = jest.fn();
        const {tr} = mount({html: "<p>old</p>", held: true, onLoadPage});
        expect(tr.root.findAllByType(WebView)).toHaveLength(0);
        expect(texts(tr)).toContain("i18n:customCardPageHeld");
        act(() => tr.root.findByType(TouchableOpacity).props.onPress());
        expect(onLoadPage).toHaveBeenCalledTimes(1);
    });

    it("pads the page by default, and a full page gets no side margins but room for the bottom bar", () => {
        const padding = (tr) => tr.root.findByType(WebView).parent.props.style;
        expect(padding(mount().tr)).toEqual(expect.objectContaining({paddingHorizontal: 12, paddingVertical: 12}));
        const {tr} = mount({padded: false, bottomInset: 80});
        expect(padding(tr).paddingHorizontal).toBeUndefined();
        expect(tr.root.findByType(CustomCardPage).children[0].props.style).toEqual(expect.objectContaining({flex: 1, paddingBottom: 80}));
    });

    it("draws the page again once after its renderer crashes, then shows an error; a new page gets its own retry", () => {
        jest.spyOn(General, "logError").mockImplementation(() => {});
        const {tr, instance, update} = mount();
        const token = instance._pageToken;
        const keyOf = () => instance.state.webViewKey;
        const first = keyOf();
        act(() => global.__webViewProps.onRenderProcessGone({nativeEvent: {didCrash: true}}));
        expect(keyOf()).not.toBe(first);
        expect(instance._pageToken).toBe(token);
        act(() => global.__webViewProps.onRenderProcessGone({nativeEvent: {didCrash: true}}));
        expect(tr.root.findAllByType(WebView)).toHaveLength(0);
        expect(texts(tr)).toContain("i18n:unknownError");
        update({html: "<p>2</p>"});
        expect(tr.root.findAllByType(WebView)).toHaveLength(1);
        act(() => global.__webViewProps.onRenderProcessGone({nativeEvent: {didCrash: true}}));
        expect(tr.root.findAllByType(WebView)).toHaveLength(1);
    });

    it("a renderer the system took back is always drawn again", () => {
        jest.spyOn(General, "logError").mockImplementation(() => {});
        const {tr} = mount();
        [1, 2, 3].forEach(() => act(() => global.__webViewProps.onRenderProcessGone({nativeEvent: {didCrash: false}})));
        expect(tr.root.findAllByType(WebView)).toHaveLength(1);
    });
});

describe("cardPageHandle", () => {
    const host = () => ({I18n: i18n, _commandNavigated: false});

    it("runs the navigation from the host, and notes that and when", () => {
        const view = host();
        const navigateFrom = jest.fn();
        const before = new Date();
        expect(cardPageHandle(view, {reportCard: {name: "c"}, isInFront: () => true, logTag: "Host"}).navigate(navigateFrom)).toBe(true);
        expect(navigateFrom).toHaveBeenCalledWith(view);
        expect(view._commandNavigated).toBe(true);
        expect(view._commandOpenedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("opens nothing while the host is not in front, or while an earlier command's screen opens", () => {
        const logDebug = jest.spyOn(General, "logDebug").mockImplementation(() => {});
        const view = host();
        const navigateFrom = jest.fn();
        expect(cardPageHandle(view, {isInFront: () => false, logTag: "Host"}).navigate(navigateFrom)).toBe(false);
        expect(logDebug).toHaveBeenCalledWith("Host", expect.stringContaining("not the screen in front"));
        view._commandNavigated = true;
        expect(cardPageHandle(view, {isInFront: () => true, logTag: "Host"}).navigate(navigateFrom)).toBe(false);
        expect(navigateFrom).not.toHaveBeenCalled();
        expect(view._commandOpenedAt).toBeUndefined();
        logDebug.mockRestore();
    });

    it("a link opens the dashboard through the host's callback, with the source dashboard, and counts as a navigation", () => {
        const view = host();
        const onOpenDashboard = jest.fn();
        const handle = cardPageHandle(view, {sourceDashboardUUID: "d1", onOpenDashboard, isInFront: () => true, logTag: "Host"});
        expect(handle.sourceDashboardUUID).toBe("d1");
        expect(handle.openDashboard("t1")).toBe(true);
        expect(onOpenDashboard).toHaveBeenCalledWith(view, "t1");
        expect(view._commandOpenedAt).toBeInstanceOf(Date);
    });
});

describe("savedSince", () => {
    const at = (iso) => new Date(iso);
    const contextWith = (rows) => {
        const filtered = jest.fn((query, time) => rows.filter((row) => row.savedAt > time
            && !["RuleFailureTelemetry", "SyncTelemetry", "UserInfo"].includes(row.entity)));
        return {filtered, context: {getService: (Class) => Class === EntityQueueService ? {findAll: () => ({filtered})} : undefined}};
    };

    it("is false with no time noted", () => {
        const {context, filtered} = contextWith([{entity: "Encounter", savedAt: at("2026-11-14T10:00:00Z")}]);
        expect(savedSince(context, null)).toBe(false);
        expect(savedSince(context, undefined)).toBe(false);
        expect(filtered).not.toHaveBeenCalled();
    });

    it("is true only for a row saved after the time", () => {
        const time = at("2026-11-14T10:00:00Z");
        expect(savedSince(contextWith([{entity: "Encounter", savedAt: at("2026-11-14T09:00:00Z")}]).context, time)).toBe(false);
        expect(savedSince(contextWith([]).context, time)).toBe(false);
        const {context, filtered} = contextWith([{entity: "Encounter", savedAt: at("2026-11-14T10:00:01Z")}]);
        expect(savedSince(context, time)).toBe(true);
        expect(filtered).toHaveBeenCalledWith(SAVED_SINCE_QUERY, time);
    });

    it("a second save of a record already queued counts, as it adds its own row", () => {
        const time = at("2026-11-14T10:00:00Z");
        const rows = [{entity: "Encounter", entityUUID: "e1", savedAt: at("2026-11-14T09:00:00Z")},
            {entity: "Encounter", entityUUID: "e1", savedAt: at("2026-11-14T10:00:01Z")}];
        expect(savedSince(contextWith(rows).context, time)).toBe(true);
    });

    it("the query leaves out rows a read writes, and runs on the new database", () => {
        ["RuleFailureTelemetry", "SyncTelemetry", "UserInfo"].forEach((entity) => expect(SAVED_SINCE_QUERY).toContain(`entity <> '${entity}'`));
        const time = at("2026-11-14T10:00:00Z");
        const parsed = RealmQueryParser.parse(SAVED_SINCE_QUERY, [time]);
        expect(parsed.unsupported).toBe(false);
        expect(parsed.where).toContain('t0."saved_at" > ?');
        expect(parsed.params).toEqual([time.getTime(), "RuleFailureTelemetry", "SyncTelemetry", "UserInfo"]);
    });
});

describe("the page's messages", () => {
    it("are in English, for the other languages to fall back to", () => {
        const en = require("../../../translations/en.json");
        ["customCardPageUpdating", "customCardPageLoading", "customCardPageNotDownloaded", "customCardPageHeld", "customCardPageLoad"]
            .forEach((key) => expect(typeof en.translations[key]).toBe("string"));
    });
});
