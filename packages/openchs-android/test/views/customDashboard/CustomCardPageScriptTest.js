// The script a Custom Design Card's page is given before it loads. It is run here on fakes of the page's window,
// document and console, as the WebView would run it.
import {buildCustomCardPageScript, PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/CustomCardPageScript";
import {RECORD_PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/RecordCommandPageDefinitions";

const PING = "avni.ping = function (args) { send('ping', args); };";
// The card page's own token, which its script puts on every command.
const TOKEN = "6f1c2a7e-0b9d-4c55-9a3e-2d8f4b1e7c90";
// The script a card page builds: the production commands and its token.
const productionScript = () => buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, TOKEN);

const runPage = (definitions = [PING], token = TOKEN, screenReader = false) => {
    const listeners = [];
    const document = {addEventListener: (type, fn, capture) => listeners.push({type, fn, capture})};
    const posted = [];
    // The reports of dropped commands, kept apart so each case can still check what was posted.
    const reports = [];
    const window = {ReactNativeWebView: {postMessage: (m) => (m.includes('"avniDropped"') ? reports : posted).push(m)}};
    const console = {warn: jest.fn()};
    new Function("window", "document", "console", buildCustomCardPageScript(definitions, token, screenReader))(window, document, console);
    // The user's own events, as the browser marks them; a test passes isTrusted: false for one the page made.
    const fire = (type, event = {}) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({type, isTrusted: true, ...event}));
    const at = (x, y) => ({touches: [{clientX: x, clientY: y}], changedTouches: [{clientX: x, clientY: y}], clientX: x, clientY: y});
    // A finger down and up in one place, then the click the WebView makes of it.
    const tap = (x = 100, y = 100) => {
        fire("touchstart", at(x, y));
        fire("touchend", at(x, y));
        fire("click", at(x, y));
    };
    return {window, document, console, listeners, posted, reports, fire, at, tap};
};

describe("CustomCardPageScript", () => {
    // The script sits in the page's html, so a later script, a library the page loads or a frame could read the token
    // from it. It takes itself out of the document before anything else runs.
    it("removes its own script element first, and keeps working", () => {
        expect(productionScript().split("\n").slice(0, 3)).toEqual([
            "(function () {",
            "  var self = document.currentScript;",
            "  if (self && self.parentNode) self.parentNode.removeChild(self);",
        ]);
        const order = [];
        const head = {removeChild: jest.fn(() => order.push("removed"))};
        const element = {parentNode: head};
        const window = {ReactNativeWebView: {postMessage: jest.fn()}};
        const document = {currentScript: element, addEventListener: () => order.push("listened")};
        new Function("window", "document", "console", productionScript())(window, document, {warn() {}});
        expect(head.removeChild).toHaveBeenCalledWith(element);
        expect(order[0]).toBe("removed");
        expect(typeof window.avni.runCardAction).toBe("function");
    });

    it("defines avni with the commands it is given, and the production commands in the real script", () => {
        // Other modules spread their lines into the same list, so only this one's is checked for.
        expect(PAGE_COMMAND_DEFINITIONS).toEqual(expect.arrayContaining(["avni.runCardAction = function (args) { send('runCardAction', args); };"]));
        expect(PAGE_COMMAND_DEFINITIONS).toEqual(expect.arrayContaining(RECORD_PAGE_COMMAND_DEFINITIONS));
        const {window} = runPage();
        expect(Object.keys(window.avni)).toEqual(["ping"]);

        const empty = {window: {}, document: {addEventListener() {}}, console: {warn() {}}};
        new Function("window", "document", "console", productionScript())(empty.window, empty.document, empty.console);
        expect(Object.keys(empty.window.avni)).toEqual(expect.arrayContaining(["runCardAction"]));
        expect(Object.keys(empty.window.avni)).toEqual(expect.arrayContaining(["openSubject", "openEnrolment", "openVisit", "editRegistration", "editEnrolment", "editExit", "editVisit", "startVisit"]));
    });

    // Only the app's own script knows the token, so a frame inside the page, or the page posting to the bridge itself,
    // cannot send a command the app takes.
    it("posts the token it is built with on every command, and keeps it off the page's window", () => {
        const {window, posted, tap} = runPage([PING], "token-a");
        tap();
        window.avni.ping({a: 1});
        expect(posted).toEqual(['{"avniCommand":"ping","args":{"a":1},"token":"token-a"}']);
        const reachable = [...Object.values(window), ...Object.values(window.avni)].map(String);
        expect(reachable.filter((value) => value.includes("token-a"))).toEqual([]);

        // The token goes into the script as a string literal, whatever it holds.
        const odd = runPage([PING], 'a"b\\c\'d');
        odd.tap();
        odd.window.avni.ping({});
        expect(JSON.parse(odd.posted[0]).token).toBe('a"b\\c\'d');
    });

    // The script runs before the page's own, so it keeps the real functions. A page that swaps them later never sees
    // the token, even after a tapped command.
    it("posts through the bridge and JSON functions it found at the start, not ones the page swaps in later", () => {
        const realStringify = JSON.stringify;
        const {window, posted, tap} = runPage();
        const seen = [];
        const spy = (name) => (...args) => {
            seen.push(name + ":" + args.map((a) => typeof a === "string" ? a : realStringify(a)).join());
        };
        window.ReactNativeWebView.postMessage = spy("post");
        JSON.stringify = spy("stringify");
        try {
            tap();
            window.avni.ping({a: 1});
        } finally {
            JSON.stringify = realStringify;
        }
        expect(posted).toEqual([`{"avniCommand":"ping","args":{"a":1},"token":"${TOKEN}"}`]);
        expect(seen).toEqual([]);
    });

    // JSON.stringify calls toJSON on the value it is given, so a page's Object.prototype.toJSON would be handed the
    // message with its token.
    it("a page's Object.prototype.toJSON never sees the token", () => {
        const {window, posted, tap} = runPage();
        const seen = [];
        Object.defineProperty(Object.prototype, "toJSON", {
            configurable: true, writable: true,
            value: function () {
                seen.push(Object.keys(this));
                return Object.assign({}, this);
            },
        });
        try {
            tap();
            window.avni.ping({a: 1});
        } finally {
            delete Object.prototype.toJSON;
        }
        expect(posted).toHaveLength(1);
        expect(JSON.parse(posted[0]).token).toBe(TOKEN);
        expect(seen.some((keys) => keys.includes("token"))).toBe(false);
    });

    // A page that defines its own avni keeps it.
    it("leaves a page's own avni as it is, and warns that page commands are off", () => {
        const listeners = [];
        const mine = {mine: true};
        const window = {avni: mine, ReactNativeWebView: {postMessage: jest.fn()}};
        const console = {warn: jest.fn()};
        new Function("window", "document", "console", productionScript())(
            window, {addEventListener: (type, fn) => listeners.push({type, fn})}, console);
        expect(window.avni).toBe(mine);
        expect(window.avni).toEqual({mine: true});
        expect(console.warn).toHaveBeenCalledWith("avni: the page already defines avni, so page commands are off on this page");
        expect(listeners).toEqual([]);
    });

    it("a page with no avni of its own gets the commands", () => {
        const window = {ReactNativeWebView: {postMessage: jest.fn()}};
        const console = {warn: jest.fn()};
        new Function("window", "document", "console", productionScript())(window, {addEventListener() {}}, console);
        expect(typeof window.avni.runCardAction).toBe("function");
        expect(console.warn).not.toHaveBeenCalled();
    });

    it("the page's runCardAction posts its args after a touch", () => {
        const listeners = [];
        const posted = [];
        const window = {ReactNativeWebView: {postMessage: (m) => m.includes('"avniDropped"') || posted.push(m)}};
        const console = {warn: jest.fn()};
        new Function("window", "document", "console", productionScript())(
            window, {addEventListener: (type, fn) => listeners.push({type, fn})}, console);
        window.avni.runCardAction({locationUUID: "abc"});
        expect(posted).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith("avni: runCardAction dropped, the page has not been touched yet");
        const point = {touches: [{clientX: 5, clientY: 5}], changedTouches: [{clientX: 5, clientY: 5}], clientX: 5, clientY: 5};
        ["touchstart", "touchend", "click"].forEach((type) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({type, ...point})));
        window.avni.runCardAction({locationUUID: "abc"});
        expect(posted).toEqual([`{"avniCommand":"runCardAction","args":{"locationUUID":"abc"},"token":"${TOKEN}"}`]);
    });

    it("watches the gesture with capturing listeners on the document", () => {
        const {listeners} = runPage();
        expect(listeners.every((l) => l.capture === true)).toBe(true);
        expect(listeners.map((l) => l.type).sort()).toEqual(["change", "click", "pointerdown", "pointermove", "pointerup", "scroll", "touchend", "touchmove", "touchstart"]);
    });

    it("posts nothing before the user touches the page, and warns", () => {
        const {window, posted, console} = runPage();
        window.avni.ping({a: 1});
        expect(posted).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith("avni: ping dropped, the page has not been touched yet");
    });

    // A swipe that starts on a row must not run the row's command: on 14 Nov a phone opened a form from a swipe, twice.
    describe("a command runs only from a tap in this page", () => {
        const PINGED = `{"avniCommand":"ping","args":{"a":1},"token":"${TOKEN}"}`;
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => {
            jest.useRealTimers();
            jest.restoreAllMocks();
        });

        it("a tap, with a small wobble, posts the command from its click, and a second command in the same handler", () => {
            const {window, posted, fire, at} = runPage();
            fire("pointerdown", at(100, 100));
            fire("touchstart", at(100, 100));
            fire("touchmove", at(106, 104));
            fire("touchend", at(106, 104));
            fire("click", at(106, 104));
            window.avni.ping({a: 1});
            window.avni.ping({a: 1});
            expect(posted).toEqual([PINGED, PINGED]);
        });

        it("a drag is dropped, on its touchend and on its click", () => {
            const {window, posted, fire, at, console} = runPage();
            fire("touchstart", at(100, 100));
            fire("touchmove", at(101, 140));
            fire("touchend", at(101, 140));
            window.avni.ping({a: 1});
            fire("click", at(101, 140));
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
            expect(console.warn).toHaveBeenCalledWith("avni: ping dropped, the touch was a drag or a scroll");
        });

        it("a gesture during which the page scrolled is dropped", () => {
            const {window, posted, fire, at} = runPage();
            fire("pointerdown", at(100, 100));
            fire("scroll");
            fire("pointerup", at(100, 100));
            fire("click", at(100, 100));
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
        });

        it("a click with no finger down in this page, as after the page was swapped under the finger, is dropped", () => {
            const {window, posted, fire, at, console} = runPage();
            fire("touchend", at(100, 100));
            fire("click", at(100, 100));
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
            expect(console.warn).toHaveBeenCalledWith("avni: ping dropped, the page has not been touched yet");
        });

        it("a long press is dropped", () => {
            let time = 1000;
            jest.spyOn(Date, "now").mockImplementation(() => time);
            const {window, posted, fire, at, console} = runPage();
            fire("touchstart", at(100, 100));
            time += 900;
            fire("touchend", at(100, 100));
            fire("click", at(100, 100));
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
            expect(console.warn).toHaveBeenCalledWith("avni: ping dropped, the touch was a long press");
        });

        // TalkBack's double tap and switch access click the focused control without a finger on it, and a keyboard's
        // Enter or Space clicks with detail 0.
        it("with a screen reader on, a click with no finger down, or from a keyboard, posts; a drag is still dropped", () => {
            let time = 1000;
            jest.spyOn(Date, "now").mockImplementation(() => time);
            const {window, posted, fire, at} = runPage([PING], TOKEN, true);
            fire("click", at(100, 100));
            window.avni.ping({a: 1});
            jest.runAllTimers();
            fire("click", {detail: 0});
            window.avni.ping({a: 1});
            jest.runAllTimers();
            fire("touchstart", at(100, 100));
            fire("touchmove", at(100, 160));
            fire("touchend", at(100, 160));
            fire("click", at(100, 160));
            window.avni.ping({a: 1});
            jest.runAllTimers();
            // A click long after that drag ended is the screen reader's own.
            time += 2000;
            fire("click", at(100, 160));
            window.avni.ping({a: 1});
            expect(posted).toEqual([PINGED, PINGED, PINGED]);
        });

        it("with no screen reader, a keyboard click is dropped, as any click with no finger down", () => {
            const {window, posted, fire} = runPage();
            fire("click", {detail: 0});
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
        });

        it("a command up to 1.5 s after a tap, as after an animation or a wait, posts; later is dropped", () => {
            const {window, posted, tap, console} = runPage();
            tap();
            jest.advanceTimersByTime(1000);
            window.avni.ping({a: 1});
            expect(posted).toEqual([PINGED]);
            jest.advanceTimersByTime(600);
            window.avni.ping({a: 1});
            expect(posted).toEqual([PINGED]);
            expect(console.warn).toHaveBeenCalledWith("avni: ping dropped, it did not run during or just after a tap");
        });

        it("a pick in a dropdown posts, from its change and for 1.5 s after", () => {
            const {window, posted, tap, fire} = runPage();
            tap(); // opens the picker
            jest.advanceTimersByTime(5000); // the user reads the options
            fire("change");
            window.avni.ping({a: 1});
            jest.advanceTimersByTime(500);
            window.avni.ping({a: 1});
            expect(posted).toEqual([PINGED, PINGED]);
        });

        it("a drag after a tap ends the tap's window", () => {
            const {window, posted, tap, fire, at} = runPage();
            tap();
            fire("touchstart", at(100, 100));
            fire("touchmove", at(100, 160));
            fire("touchend", at(100, 160));
            jest.advanceTimersByTime(100);
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
        });

        it("a touch or a change the page makes itself opens nothing", () => {
            const {window, posted, fire, at} = runPage();
            fire("touchstart", {...at(100, 100), isTrusted: false});
            fire("touchend", {...at(100, 100), isTrusted: false});
            fire("click", {...at(100, 100), isTrusted: false});
            window.avni.ping({a: 1});
            fire("change", {isTrusted: false});
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
        });

        it("a command called on page load is dropped and reported to the app with its token", () => {
            const {window, posted, reports} = runPage();
            window.avni.ping({a: 1});
            expect(posted).toEqual([]);
            expect(reports.map((r) => JSON.parse(r))).toEqual([{avniDropped: "ping", reason: "the page has not been touched yet", token: TOKEN}]);
        });
    });

    it("keeps the message bridge it found at the start, so a page that replaces it gets no token", () => {
        const {window, posted, tap} = runPage();
        const later = [];
        window.ReactNativeWebView = {postMessage: (m) => later.push(m)};
        tap();
        window.avni.ping({a: 1});
        expect(posted).toHaveLength(1);
        expect(later).toEqual([]);
    });

    // The WebView adds its bridge before any script on the page runs, so this is only a guard.
    it("with no message bridge at the start, sends nothing and warns", () => {
        const listeners = [];
        const window = {};
        const console = {warn: jest.fn()};
        new Function("window", "document", "console", productionScript())(window, {addEventListener: (type, fn) => listeners.push({type, fn})}, console);
        window.ReactNativeWebView = {postMessage: jest.fn()};
        const point = {touches: [{clientX: 5, clientY: 5}], changedTouches: [{clientX: 5, clientY: 5}], clientX: 5, clientY: 5};
        ["touchstart", "touchend", "click"].forEach((type) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({type, ...point})));
        window.avni.runCardAction({locationUUID: "abc"});
        expect(window.ReactNativeWebView.postMessage).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith("avni: runCardAction dropped, the app bridge is missing");
    });

    it("ends with true, as injected scripts must", () => {
        expect(buildCustomCardPageScript([], TOKEN).trim().endsWith("true;")).toBe(true);
        // An injected script's value is the value of its last statement, which only eval hands back.
        const {window, document, console} = runPage();
        const value = new Function("window", "document", "console", "script", "return eval(script)")(window, document, console, buildCustomCardPageScript([], TOKEN));
        expect(value).toBe(true);
    });
});
