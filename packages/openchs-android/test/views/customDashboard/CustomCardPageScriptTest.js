// The script a Custom Design Card's page is given before it loads. It is run here on fakes of the page's window,
// document and console, as the WebView would run it.
import {buildCustomCardPageScript, CUSTOM_CARD_PAGE_SCRIPT, PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/CustomCardPageScript";

const PING = "avni.ping = function (args) { send('ping', args); };";

const runPage = (definitions = [PING]) => {
    const listeners = [];
    const document = {addEventListener: (type, fn, capture) => listeners.push({type, fn, capture})};
    const posted = [];
    const window = {ReactNativeWebView: {postMessage: (m) => posted.push(m)}};
    const console = {warn: jest.fn()};
    new Function("window", "document", "console", buildCustomCardPageScript(definitions))(window, document, console);
    const fire = (type) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({type}));
    return {window, document, console, listeners, posted, fire};
};

describe("CustomCardPageScript", () => {
    it("defines avni with the commands it is given, and none in production", () => {
        expect(PAGE_COMMAND_DEFINITIONS).toEqual([]);
        const {window} = runPage();
        expect(Object.keys(window.avni)).toEqual(["ping"]);

        const empty = {window: {}, document: {addEventListener() {}}, console: {warn() {}}};
        new Function("window", "document", "console", CUSTOM_CARD_PAGE_SCRIPT)(empty.window, empty.document, empty.console);
        expect(Object.keys(empty.window.avni)).toEqual([]);
    });

    it("registers capturing touchstart and click listeners on the document", () => {
        const {listeners} = runPage();
        expect(listeners.map((l) => [l.type, l.capture]).sort()).toEqual([["click", true], ["touchstart", true]]);
    });

    it("posts nothing before the user touches the page, and warns", () => {
        const {window, posted, console} = runPage();
        window.avni.ping({a: 1});
        expect(posted).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith("avni: ping ignored, the page has not been touched yet");
    });

    it("posts the command after a touch", () => {
        const {window, posted, fire} = runPage();
        fire("touchstart");
        window.avni.ping({a: 1});
        expect(posted).toEqual(['{"avniCommand":"ping","args":{"a":1}}']);
    });

    it("posts the command after a click", () => {
        const {window, posted, fire} = runPage();
        fire("click");
        window.avni.ping({a: 1});
        expect(posted).toEqual(['{"avniCommand":"ping","args":{"a":1}}']);
    });

    it("keeps posting after the first touch", () => {
        const {window, posted, fire} = runPage();
        fire("touchstart");
        window.avni.ping({a: 1});
        window.avni.ping({a: 2});
        expect(posted).toHaveLength(2);
    });

    it("reads the app's message bridge at call time", () => {
        const {window, posted, fire} = runPage();
        const later = [];
        window.ReactNativeWebView = {postMessage: (m) => later.push(m)};
        fire("click");
        window.avni.ping({a: 1});
        expect(posted).toEqual([]);
        expect(later).toHaveLength(1);
    });

    it("ends with true, as injected scripts must", () => {
        expect(buildCustomCardPageScript([]).trim().endsWith("true;")).toBe(true);
        // An injected script's value is the value of its last statement, which only eval hands back.
        const {window, document, console} = runPage();
        const value = new Function("window", "document", "console", "script", "return eval(script)")(window, document, console, buildCustomCardPageScript([]));
        expect(value).toBe(true);
    });
});
