// The script a Custom Design Card's page is given before it loads. It is run here on fakes of the page's window,
// document and console, as the WebView would run it.
import {buildCustomCardPageScript, PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/CustomCardPageScript";
import {RECORD_PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/RecordCommandPageDefinitions";

const PING = "avni.ping = function (args) { send('ping', args); };";
// The card page's own token, which its script puts on every command.
const TOKEN = "6f1c2a7e-0b9d-4c55-9a3e-2d8f4b1e7c90";
// The script a card page builds: the production commands and its token.
const productionScript = () => buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, TOKEN);

const runPage = (definitions = [PING], token = TOKEN) => {
    const listeners = [];
    const document = {addEventListener: (type, fn, capture) => listeners.push({type, fn, capture})};
    const posted = [];
    const window = {ReactNativeWebView: {postMessage: (m) => posted.push(m)}};
    const console = {warn: jest.fn()};
    new Function("window", "document", "console", buildCustomCardPageScript(definitions, token))(window, document, console);
    const fire = (type) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({type}));
    return {window, document, console, listeners, posted, fire};
};

describe("CustomCardPageScript", () => {
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
        const {window, posted, fire} = runPage([PING], "token-a");
        fire("touchstart");
        window.avni.ping({a: 1});
        expect(posted).toEqual(['{"avniCommand":"ping","args":{"a":1},"token":"token-a"}']);
        const reachable = [...Object.values(window), ...Object.values(window.avni)].map(String);
        expect(reachable.filter((value) => value.includes("token-a"))).toEqual([]);

        // The token goes into the script as a string literal, whatever it holds.
        const odd = runPage([PING], 'a"b\\c\'d');
        odd.fire("click");
        odd.window.avni.ping({});
        expect(JSON.parse(odd.posted[0]).token).toBe('a"b\\c\'d');
    });

    // On Android the script can run after the page's own scripts, so a page's own avni can be there first.
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
        const window = {ReactNativeWebView: {postMessage: (m) => posted.push(m)}};
        const console = {warn: jest.fn()};
        new Function("window", "document", "console", productionScript())(
            window, {addEventListener: (type, fn) => listeners.push({type, fn})}, console);
        window.avni.runCardAction({locationUUID: "abc"});
        expect(posted).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith("avni: runCardAction ignored, the page has not been touched yet");
        listeners.filter((l) => l.type === "touchstart").forEach((l) => l.fn({type: "touchstart"}));
        window.avni.runCardAction({locationUUID: "abc"});
        expect(posted).toEqual([`{"avniCommand":"runCardAction","args":{"locationUUID":"abc"},"token":"${TOKEN}"}`]);
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
        expect(posted).toEqual([`{"avniCommand":"ping","args":{"a":1},"token":"${TOKEN}"}`]);
    });

    it("posts the command after a click", () => {
        const {window, posted, fire} = runPage();
        fire("click");
        window.avni.ping({a: 1});
        expect(posted).toEqual([`{"avniCommand":"ping","args":{"a":1},"token":"${TOKEN}"}`]);
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
        expect(buildCustomCardPageScript([], TOKEN).trim().endsWith("true;")).toBe(true);
        // An injected script's value is the value of its last statement, which only eval hands back.
        const {window, document, console} = runPage();
        const value = new Function("window", "document", "console", "script", "return eval(script)")(window, document, console, buildCustomCardPageScript([], TOKEN));
        expect(value).toBe(true);
    });
});
