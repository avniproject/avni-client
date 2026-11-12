/**
 * Regression guard: the Aadhaar number typed on Avni's verify screens reaches Eka's creation screen and is stored
 * nowhere on the way. Drives the real path: AbhaVerifyView and its flow (no ABHA for the Aadhaar), the registration's
 * AbhaRegistrationFlow, CHSNavigator and TypedTransition, and AbhaView building Eka's page, with every store the phone
 * has watched: AsyncStorage, the keychain, files, the database and the registration's own state.
 *
 * Run: npx jest test/views/abha/AbhaAadhaarNeverStoredTest.js --selectProjects unit --verbose
 */
import React from "react";
import {Button, TextInput, ToastAndroid} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

// CHSNavigator imports most of the view layer; these are the native modules it reaches that jest has no bridge for.
jest.mock("react-native-zip-archive", () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock("react-native-randombytes", () => ({randomBytes: (n) => new Uint8Array(n || 16)}));
jest.mock("react-native-geolocation-service", () => ({}));
jest.mock("react-native-tcp-socket", () => ({}));
jest.mock("react-native-background-timer", () => ({}));
jest.mock("@react-native-documents/picker", () => ({}));
jest.mock("react-native-vision-camera", () => ({}));
jest.mock("@react-native-clipboard/clipboard", () => ({}));
jest.mock("react-native-share", () => ({}));
jest.mock("react-native-file-viewer", () => ({}));
jest.mock("react-native-vector-icons/MaterialIcons", () => ({__esModule: true, default: () => null}));
jest.mock("react-native-webview", () => ({
    WebView: (props) => require("react").createElement(require("react-native").View, {testID: "webview", ...props}),
}));
jest.mock("react-native-smooth-pincode-input", () => (props) => require("react").createElement(require("react-native").View, {testID: "pin", ...props}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));
jest.mock("@react-native-cookies/cookies", () => ({get: jest.fn(() => Promise.resolve({}))}));
jest.mock("../../../src/GlobalContext", () => ({
    __esModule: true,
    default: {
        getInstance: () => ({
            beanRegistry: {
                register: () => {},
                getService: (name) => name === "authService"
                    ? {getAuthProviderService: () => ({getAuthToken: async () => "avni-user-token"})}
                    : {getSettings: () => ({idpType: "cognito"})},
            },
        }),
    },
}));
jest.mock("../../../src/utility/ConnectionInfo", () => ({getConnectionInfo: jest.fn(async () => ({isConnected: true}))}));
jest.mock("react-native-keychain", () => ({
    getGenericPassword: jest.fn(async () => false),
    setGenericPassword: jest.fn(async () => ({})),
    resetGenericPassword: jest.fn(async () => true),
    setInternetCredentials: jest.fn(async () => ({})),
}));
jest.mock("react-native-fs", () => ({
    writeFile: jest.fn(async () => {}),
    appendFile: jest.fn(async () => {}),
    copyFile: jest.fn(async () => {}),
    moveFile: jest.fn(async () => {}),
    readDir: jest.fn(async () => []),
    unlink: jest.fn(async () => {}),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import RNFS from "react-native-fs";
import ReactNativeBlobUtil from "react-native-blob-util";
import {Individual, SubjectType} from "avni-models";
import ServiceContext from "../../../src/framework/context/ServiceContext";
import AbhaVerifyView from "../../../src/views/abha/verify/AbhaVerifyView";
import AbhaView from "../../../src/views/abha/AbhaView";
import AbhaRegistrationFlow from "../../../src/views/abha/AbhaRegistrationFlow";
import AbhaService from "../../../src/service/AbhaService";
import {EkaAbhaError} from "../../../src/service/EkaAbhaClient";
import General from "../../../src/utility/General";

// Made up, with a valid check digit, so the verify screen sends it to Eka.
const AADHAAR = "234123412346";
const SESSION = {accessToken: "eka-key", expiresAt: "2026-10-20T10:30:00Z", expiresInSeconds: 1800, environment: "sandbox", hipId: "hip-1"};

const flush = async () => {
    for (let i = 0; i < 10; i++) await act(async () => new Promise((resolve) => setImmediate(resolve)));
};

// Any value, however deep, as text, functions and cycles left out.
const asText = (value) => {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, v) => {
        if (typeof v === "function") return undefined;
        if (v && typeof v === "object") {
            if (seen.has(v)) return undefined;
            seen.add(v);
        }
        return v;
    }) || "";
};

// A store nothing on this path should use: every call, of any method, is kept to be checked.
function recorder(calls, name) {
    return new Proxy({}, {get: (target, method) => (...args) => { calls.push([`${name}.${String(method)}`, args]); return undefined; }});
}

function navigatorFake() {
    const routes = [];
    return {
        routes,
        getCurrentRoutes: () => routes,
        push: (route) => routes.push(route),
        replace: (route) => { routes.pop(); routes.push(route); },
        pop: () => routes.pop(),
        popN: (n) => routes.splice(routes.length - n, n),
    };
}

// The registration screen the ABHA step belongs to, holding a real AbhaService on a database that records any use.
function registrationScreen(navigator, storeCalls) {
    const individual = Individual.createEmptySubjectInstance();
    individual.subjectType = Object.assign(SubjectType.create("Person"), {uuid: "st-person"});
    const abhaService = new AbhaService(recorder(storeCalls, "db"), {getService: () => ({getSettings: () => ({serverURL: "https://server"})})});
    return {
        context: {navigator: () => navigator},
        state: {abha: {enabledForUser: true, formHasConcepts: true, linked: false, choice: null}, individual},
        props: {params: {editing: false}},
        I18n: {t: (key) => key},
        getService: (serviceClass) => (serviceClass === AbhaService ? abhaService : recorder(storeCalls, serviceClass && serviceClass.name || "service")),
        dispatchAction: (...args) => storeCalls.push(["registration.dispatchAction", args]),
        askAbhaConsent: jest.fn(),
        runAfterSceneTransition: (fn) => fn(),
        _isUnmounted: false,
    };
}

let mounted = [];

async function render(element, navigator) {
    const context = {getService: () => ({getI18n: () => ({t: (key) => key})}), navigator: () => navigator};
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>{element}</ServiceContext.Provider>);
    });
    mounted.push(renderer);
    return renderer;
}

describe("the Aadhaar carried from verify to Eka's creation", () => {
    let logged;

    beforeEach(async () => {
        await AsyncStorage.clear();
        jest.clearAllMocks();
        logged = [];
        ["logDebug", "logInfo", "logWarn", "logError"].forEach((level) => jest.spyOn(General, level).mockImplementation((...args) => logged.push(args)));
        jest.spyOn(General, "isDebugEnabled").mockReturnValue(true);
        jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
        global.fetch = jest.fn(async () => ({status: 200, url: "https://server/abha/session", json: async () => SESSION, text: async () => JSON.stringify(SESSION)}));
    });

    afterEach(() => {
        mounted.forEach((renderer) => act(() => renderer.unmount()));
        mounted = [];
        jest.restoreAllMocks();
    });

    it("is stored nowhere: not in AsyncStorage, the keychain, a file, the database or the registration", async () => {
        const navigator = navigatorFake();
        const storeCalls = [];
        const registration = registrationScreen(navigator, storeCalls);

        await new AbhaRegistrationFlow(registration).open({route: "verify"});
        const verifyRoute = navigator.routes[0];
        expect(verifyRoute.path).toBe(AbhaVerifyView.path());

        const noAbhaForAadhaar = {
            search: jest.fn(), methods: jest.fn(), loginVerify: jest.fn(), loginPhr: jest.fn(),
            loginInit: jest.fn(() => Promise.reject(new EkaAbhaError("login init", 404, null, "ABDM-1114"))),
        };
        const verify = await render(<AbhaVerifyView {...verifyRoute.queryParams} client={noAbhaForAadhaar}/>, navigator);
        const press = async (title) => act(async () => verify.root.findAllByType(Button).find((b) => b.props.title === title).props.onPress());
        await press("abhaVerifyMethodAadhaar");
        await act(async () => verify.root.findByType(TextInput).props.onChangeText(AADHAAR));
        await press("abhaVerifyContinue");
        await press("abhaVerifyCreate");
        await flush();

        const ekaRoute = navigator.routes[navigator.routes.length - 1];
        expect(ekaRoute.path).toBe(AbhaView.path());
        const eka = await render(<AbhaView {...ekaRoute.queryParams}/>, navigator);
        const page = eka.root.findAll((node) => node.props.testID === "webview" && typeof node.type !== "string")[0].props;
        // The Aadhaar did reach Eka's page, so the path ran end to end.
        expect(page.source.html).toContain(`"identifier":"${AADHAAR}"`);

        const stored = [
            ...["setItem", "multiSet", "mergeItem", "multiMerge"].map((method) => [`AsyncStorage.${method}`, AsyncStorage[method].mock.calls]),
            ...["setGenericPassword", "setInternetCredentials"].map((method) => [`Keychain.${method}`, Keychain[method].mock.calls]),
            ...["writeFile", "appendFile", "copyFile", "moveFile"].map((method) => [`RNFS.${method}`, RNFS[method].mock.calls]),
            ["ReactNativeBlobUtil.fs.writeFile", ReactNativeBlobUtil.fs.writeFile.mock.calls],
            ...storeCalls,
        ];
        stored.forEach(([store, calls]) => expect([store, asText(calls).includes(AADHAAR)]).toEqual([store, false]));
        expect(logged.length).toBeGreaterThan(0);
        expect(asText(logged)).not.toContain(AADHAAR);
    });
});
