import {expect} from "chai";

jest.mock("@react-native-cookies/cookies", () => ({get: jest.fn(() => Promise.resolve({}))}));
jest.mock("../../src/GlobalContext", () => ({
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

const mockUnlink = jest.fn(() => Promise.resolve());
const mockReadDir = jest.fn(() => Promise.resolve([]));
jest.mock("react-native-fs", () => ({unlink: (...args) => mockUnlink(...args), readDir: (...args) => mockReadDir(...args), exists: jest.fn(() => Promise.resolve(true))}));
jest.mock("../../src/service/AuthAwareDownload", () => ({downloadWithAuth: jest.fn()}));
jest.mock("react-native-blob-util", () => ({fs: {dirs: {CacheDir: "/cache"}}}));
// The Android keychain, in memory, by service name.
const mockKeychainStore = new Map();
jest.mock("react-native-keychain", () => ({
    getGenericPassword: jest.fn(async (options = {}) => (mockKeychainStore.has(options.service)
        ? {username: "kept", password: mockKeychainStore.get(options.service), service: options.service} : false)),
    setGenericPassword: jest.fn(async (username, password, options = {}) => {
        mockKeychainStore.set(options.service, password);
        return {service: options.service, storage: "KeystoreAESGCM_NoAuth"};
    }),
    resetGenericPassword: jest.fn(async (options = {}) => mockKeychainStore.delete(options.service)),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import {downloadWithAuth} from "../../src/service/AuthAwareDownload";
import AbhaService from "../../src/service/AbhaService";
import AbhaError from "../../src/service/AbhaError";
import AbhaBranding from "../../src/views/abha/AbhaBranding";
import AuthenticationError from "../../src/service/AuthenticationError";
import General from "../../src/utility/General";
import ErrorUtil from "../../src/framework/errorHandling/ErrorUtil";
import en from "../../translations/en.json";

const EKA_KEY = "eka-access-key-7f3a";
const SESSION = {accessToken: EKA_KEY, expiresAt: "2026-10-20T10:30:00Z", environment: "sandbox", hipId: "hip-1"};

const reply = (status, body) => ({
    status,
    url: "https://server/abha",
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

// Any read or write of the database fails the test.
const untouchableDb = new Proxy({}, {get: (target, property) => { throw new Error(`database touched: ${String(property)}`); }});

function service() {
    const settingsService = {getSettings: () => ({serverURL: "https://server"})};
    return new AbhaService(untouchableDb, {getService: () => settingsService});
}

const failureOf = (promise) => promise.then(() => { throw new Error("expected a failure"); }, (error) => error);

const ABHA_NUMBER = "91-1234-5678-9012";
const ABHA_DIGITS = "91123456789012";
const EVENT = {
    uuid: "ev-1", subjectUUID: "s-1", subjectTypeUUID: "st-1", action: "linked", route: "aadhaar",
    abhaNumber: ABHA_NUMBER, abhaAddress: "asha.rao@abdm", ekaOid: "oid-77", ekaTxnId: "txn-1",
    consentGivenAt: "2026-10-20T04:00:00.000Z", occurredAt: "2026-10-20T04:01:00.000Z",
};
const PATIENT_DETAILS = [ABHA_NUMBER, ABHA_DIGITS, "asha.rao@abdm", "oid-77"];

function captureLogs() {
    const logged = [];
    ["logDebug", "logInfo", "logWarn", "logError"].forEach((level) =>
        jest.spyOn(General, level).mockImplementation((...args) => logged.push(args)));
    ["log", "info", "warn", "error", "debug"].forEach((level) =>
        jest.spyOn(console, level).mockImplementation((...args) => logged.push(args)));
    jest.spyOn(General, "isDebugEnabled").mockReturnValue(true);
    return logged;
}

const asText = (arg) => typeof arg === "string" ? arg : JSON.stringify(arg) || "";

// What reached Bugsnag: each report's message, and nothing else of the error.
function bugsnagReports() {
    const notify = jest.spyOn(ErrorUtil, "notifyBugsnag").mockImplementation((error) => Promise.resolve(error));
    return () => notify.mock.calls.map(([error, source]) => {
        expect(source).to.equal("AbhaService");
        expect(Object.keys(error)).to.deep.equal([]);
        return error.message;
    });
}

// Lets the promises already queued run, until the check holds.
async function until(check) {
    for (let i = 0; i < 50 && !check(); i++) await new Promise((resolve) => setImmediate(resolve));
    if (!check()) throw new Error("never happened");
}

describe("AbhaServiceTest", () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        mockKeychainStore.clear();
        [Keychain.getGenericPassword, Keychain.setGenericPassword, Keychain.resetGenericPassword].forEach((fn) => fn.mockClear());
    });
    afterEach(() => jest.restoreAllMocks());

    it("asks the server for a session for the subject type and returns it as sent", async () => {
        global.fetch = jest.fn(async () => reply(200, SESSION));

        const session = await service().getSession("st-1");

        expect(session).to.deep.equal(SESSION);
        const [url, init] = global.fetch.mock.calls[0];
        expect(url).to.equal("https://server/abha/session?subjectTypeUUID=st-1");
        expect(init.method).to.equal("GET");
        expect(init.headers["AUTH-TOKEN"]).to.equal("avni-user-token");
    });

    it("reads the build's branding with the session, so Eka's screens open already dressed", async () => {
        global.fetch = jest.fn(async () => reply(200, SESSION));
        const load = jest.spyOn(AbhaBranding, "load").mockResolvedValue({brandColour: "#00767D"});

        expect(await service().getSession("st-1")).to.deep.equal(SESSION);
        expect(load.mock.calls).to.have.length(1);
    });

    it("still refuses as before when the server refuses, branding or not", async () => {
        global.fetch = jest.fn(async () => reply(409, {code: "ABHA_NOT_CONFIGURED"}));
        jest.spyOn(AbhaBranding, "load").mockResolvedValue({brandColour: "#00767D"});

        expect(await failureOf(service().getSession("st-1"))).to.be.instanceOf(AbhaError);
    });

    it("notConfigured409BecomesAbhaError", async () => {
        global.fetch = jest.fn(async () => reply(409, {code: "ABHA_NOT_CONFIGURED"}));

        const error = await failureOf(service().getSession("st-1"));

        expect(error).to.be.instanceOf(AbhaError);
        expect(error.code).to.equal("ABHA_NOT_CONFIGURED");
        expect(error.status).to.equal(409);
    });

    it("forbiddenCodesMapped", async () => {
        for (const code of ["ABHA_DISABLED", "ABHA_NO_PRIVILEGE", "ABHA_NO_HEALTH_CENTRE"]) {
            global.fetch = jest.fn(async () => reply(403, {code}));
            const error = await failureOf(service().getSession("st-1"));
            expect(error, code).to.be.instanceOf(AbhaError);
            expect(error.code).to.equal(code);
            expect(error.status).to.equal(403);
        }
    });

    it("gives each refusal its own message, and anything else the general one", async () => {
        expect(AbhaError.messageKey(new AbhaError("ABHA_NOT_CONFIGURED", 409))).to.equal("abhaNotConfigured");
        expect(AbhaError.messageKey(new AbhaError("ABHA_NO_HEALTH_CENTRE", 403))).to.equal("abhaNoHealthCentre");
        expect(AbhaError.messageKey(new AbhaError("ABHA_NO_PRIVILEGE", 403))).to.equal("abhaNoPermission");
        expect(AbhaError.messageKey(new AbhaError("ABHA_DISABLED", 403))).to.equal("abhaDisabled");
        expect(AbhaError.messageKey(new AbhaError(null, 500))).to.equal("abhaError");
        expect(AbhaError.messageKey(new Error("Network request failed"))).to.equal("abhaError");
    });

    it("names an unknown subject type and Eka not answering, each with its own message, on every ABHA call", async () => {
        const refusals = [[400, "ABHA_UNKNOWN_SUBJECT_TYPE", "abhaUnknownSubjectType"], [502, "ABHA_EKA_UNAVAILABLE", "abhaEkaUnavailable"]];
        for (const [status, code, messageKey] of refusals) {
            global.fetch = jest.fn(async () => reply(status, {code}));
            for (const call of [(s) => s.getSession("st-1"), (s) => s.findSubjectUUIDs("st-1", ABHA_NUMBER)]) {
                const error = await failureOf(call(service()));
                expect(error, code).to.be.instanceOf(AbhaError);
                expect(error.code).to.equal(code);
                expect(error.status).to.equal(status);
                expect(AbhaError.messageKey(error)).to.equal(messageKey);
            }
            expect(en.translations[messageKey], messageKey).to.be.a("string");
        }
    });

    it("names an ABHA number the server finds invalid, with its own message", async () => {
        global.fetch = jest.fn(async () => reply(400, {code: "ABHA_NUMBER_INVALID"}));
        const error = await failureOf(service().findSubjectUUIDs("st-1", "91-1234"));
        expect(error).to.be.instanceOf(AbhaError);
        expect(error.code).to.equal("ABHA_NUMBER_INVALID");
        expect(AbhaError.messageKey(error)).to.equal("abhaNumberInvalid");
        expect(en.translations.abhaNumberInvalid).to.be.a("string");
    });

    it("keeps an audit record Eka was too busy for, to send again, and drops one for an unknown subject type", async () => {
        const abhaService = service();
        global.fetch = jest.fn(async () => reply(502, {code: "ABHA_EKA_UNAVAILABLE"}));
        await abhaService.recordEvent(EVENT);
        global.fetch = jest.fn(async () => reply(400, {code: "ABHA_UNKNOWN_SUBJECT_TYPE"}));
        await abhaService.resendUnsentEvents();
        expect(global.fetch.mock.calls.length).to.equal(1);
        global.fetch = jest.fn(async () => reply(201, {}));
        await abhaService.resendUnsentEvents();
        expect(global.fetch.mock.calls.length).to.equal(0);
    });

    it("treats a refusal whose body names no reason as a general error", async () => {
        global.fetch = jest.fn(async () => reply(500, "<html>Internal Server Error</html>"));

        const error = await failureOf(service().getSession("st-1"));

        expect(error).to.be.instanceOf(AbhaError);
        expect(error.code).to.equal(null);
        expect(AbhaError.messageKey(error)).to.equal("abhaError");
    });

    it("leaves an expired login and an unreachable server as they are", async () => {
        global.fetch = jest.fn(async () => reply(401, {}));
        expect(await failureOf(service().getSession("st-1"))).to.be.instanceOf(AuthenticationError);

        global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
        const offline = await failureOf(service().getSession("st-1"));
        expect(offline).to.not.be.instanceOf(AbhaError);
        expect(offline.message).to.equal("Network request failed");
    });

    it("sessionNeverLogged, whether the server gives the key or refuses", async () => {
        const logged = [];
        ["logDebug", "logInfo", "logWarn", "logError"].forEach((level) =>
            jest.spyOn(General, level).mockImplementation((...args) => logged.push(args)));
        ["log", "info", "warn", "error", "debug"].forEach((level) =>
            jest.spyOn(console, level).mockImplementation((...args) => logged.push(args)));
        jest.spyOn(General, "isDebugEnabled").mockReturnValue(true);

        global.fetch = jest.fn(async () => reply(200, SESSION));
        await service().getSession("st-1");
        global.fetch = jest.fn(async () => reply(403, {code: "ABHA_NO_PRIVILEGE"}));
        await failureOf(service().getSession("st-1"));

        expect(logged.length).to.be.greaterThan(0);
        logged.forEach((args) => args.forEach((arg) =>
            expect(typeof arg === "string" ? arg : JSON.stringify(arg) || "").to.not.contain(EKA_KEY)));
    });

    it("never stores the key: the session is fetched without touching the database", async () => {
        global.fetch = jest.fn(async () => reply(200, SESSION));
        expect((await service().getSession("st-1")).accessToken).to.equal(EKA_KEY);
    });

    it("asks which patients hold an ABHA number with the number in the body, as digits, never in the address", async () => {
        global.fetch = jest.fn(async () => reply(200, {subjectUUIDs: ["s-9"]}));

        expect(await service().findSubjectUUIDs("st-1", ABHA_NUMBER)).to.deep.equal(["s-9"]);

        const [url, init] = global.fetch.mock.calls[0];
        expect(url).to.equal("https://server/abha/subjects/search");
        expect(init.method).to.equal("POST");
        expect(JSON.parse(init.body)).to.deep.equal({subjectTypeUUID: "st-1", abhaNumber: ABHA_DIGITS});
        expect(init.headers["AUTH-TOKEN"]).to.equal("avni-user-token");
    });

    // An ABHA made with a mobile number only has an address and no number: the address goes too, in the body.
    it("asks by ABHA address as well when there is one, or by it alone", async () => {
        global.fetch = jest.fn(async () => reply(200, {subjectUUIDs: ["s-9"]}));

        await service().findSubjectUUIDs("st-1", ABHA_NUMBER, "asha.rao@abdm");
        await service().findSubjectUUIDs("st-1", null, "asha.rao@abdm");

        expect(JSON.parse(global.fetch.mock.calls[0][1].body)).to.deep.equal({subjectTypeUUID: "st-1", abhaNumber: ABHA_DIGITS, abhaAddress: "asha.rao@abdm"});
        expect(JSON.parse(global.fetch.mock.calls[1][1].body)).to.deep.equal({subjectTypeUUID: "st-1", abhaNumber: null, abhaAddress: "asha.rao@abdm"});
        expect(global.fetch.mock.calls[1][0]).to.equal("https://server/abha/subjects/search");
    });

    it("reads no holders as an empty list, and maps refusals as for the session", async () => {
        global.fetch = jest.fn(async () => reply(200, {subjectUUIDs: []}));
        expect(await service().findSubjectUUIDs("st-1", ABHA_NUMBER)).to.deep.equal([]);

        global.fetch = jest.fn(async () => reply(403, {code: "ABHA_NO_PRIVILEGE"}));
        const error = await failureOf(service().findSubjectUUIDs("st-1", ABHA_NUMBER));
        expect(error).to.be.instanceOf(AbhaError);
        expect(error.code).to.equal("ABHA_NO_PRIVILEGE");
    });

    it("treats an answer with no list of patients as a failure, never as no other holder", async () => {
        for (const body of [{}, {subjectUUIDs: null}, {subjectUUIDs: "s-9"}, null]) {
            global.fetch = jest.fn(async () => reply(200, body));
            const error = await failureOf(service().findSubjectUUIDs("st-1", ABHA_NUMBER));
            expect(error, JSON.stringify(body)).to.be.instanceOf(Error);
            expect(AbhaError.messageKey(error)).to.equal("abhaError");
            expect(error.message).to.not.contain(ABHA_DIGITS);
        }
    });

    it("never logs the ABHA number it asks about, whether the server answers or refuses", async () => {
        const logged = captureLogs();
        global.fetch = jest.fn(async () => reply(200, {subjectUUIDs: ["s-9"]}));
        await service().findSubjectUUIDs("st-1", ABHA_NUMBER);
        global.fetch = jest.fn(async () => reply(403, {code: "ABHA_DISABLED"}));
        await failureOf(service().findSubjectUUIDs("st-1", ABHA_NUMBER));

        expect(logged.length).to.be.greaterThan(0);
        logged.forEach((args) => args.forEach((arg) => PATIENT_DETAILS.forEach((detail) =>
            expect(asText(arg)).to.not.contain(detail))));
    });

    it("records an ABHA action by posting the audit record as it is", async () => {
        global.fetch = jest.fn(async () => reply(201, {}));

        expect(await service().recordEvent(EVENT)).to.equal(true);

        const [url, init] = global.fetch.mock.calls[0];
        expect(url).to.equal("https://server/abha/events");
        expect(init.method).to.equal("POST");
        expect(JSON.parse(init.body)).to.deep.equal(EVENT);
    });

    it("keeps a record that did not reach the server, never rejects, and sends it again when asked", async () => {
        const abhaService = service();
        global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
        expect(await abhaService.recordEvent(EVENT)).to.equal(false);

        global.fetch = jest.fn(async () => reply(500, "<html>busy</html>"));
        await abhaService.resendUnsentEvents();
        expect(global.fetch.mock.calls.length).to.equal(1);

        global.fetch = jest.fn(async () => reply(200, {}));
        await abhaService.resendUnsentEvents();
        expect(global.fetch.mock.calls.length).to.equal(1);
        expect(JSON.parse(global.fetch.mock.calls[0][1].body).uuid).to.equal("ev-1");

        global.fetch = jest.fn(async () => reply(201, {}));
        await abhaService.resendUnsentEvents();
        expect(global.fetch.mock.calls.length).to.equal(0);
    });

    describe("audit records that have not reached the server", () => {
        it("are kept on the phone, so one that failed before a restart is sent by the app that starts next", async () => {
            global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
            expect(await service().recordEvent(EVENT)).to.equal(false);

            const afterRestart = service();
            global.fetch = jest.fn(async () => reply(201, {}));
            await afterRestart.resendUnsentEvents();
            expect(global.fetch.mock.calls.length).to.equal(1);
            expect(JSON.parse(global.fetch.mock.calls[0][1].body)).to.deep.equal(EVENT);

            global.fetch = jest.fn(async () => reply(201, {}));
            await service().resendUnsentEvents();
            expect(global.fetch.mock.calls.length).to.equal(0);
        });

        it("stay kept while on their way, until the server answers", async () => {
            let answer;
            global.fetch = jest.fn(() => new Promise((resolve) => { answer = resolve; }));
            const sending = service().recordEvent(EVENT);
            await until(() => global.fetch.mock.calls.length === 1);

            const afterRestart = service();
            global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
            await afterRestart.resendUnsentEvents();
            expect(global.fetch.mock.calls.length, "a restart while the record was on its way still has it").to.equal(1);

            answer(reply(201, {}));
            expect(await sending).to.equal(true);
            global.fetch = jest.fn(async () => reply(201, {}));
            await service().resendUnsentEvents();
            expect(global.fetch.mock.calls.length).to.equal(0);
        });

        it("can be kept without being sent, for an ABHA action whose outcome is not known yet", async () => {
            global.fetch = jest.fn(async () => reply(201, {}));
            await service().keepEvent(EVENT);
            expect(global.fetch.mock.calls.length).to.equal(0);

            await service().resendUnsentEvents();
            expect(global.fetch.mock.calls.length).to.equal(1);
            expect(JSON.parse(global.fetch.mock.calls[0][1].body)).to.deep.equal(EVENT);
        });

        it("are dropped only on 400, 403 or 409, and kept on 401, 408, 429, a server error or a timeout", async () => {
            const answers = [[400, false], [403, false], [409, false], [401, true], [404, true], [408, true], [429, true], [500, true], [502, true], [503, true]];
            for (const [status, kept] of answers) {
                mockKeychainStore.clear();
                global.fetch = jest.fn(async () => reply(status, {code: "SOME_CODE"}));
                expect(await service().recordEvent(EVENT), String(status)).to.equal(false);
                global.fetch = jest.fn(async () => reply(201, {}));
                await service().resendUnsentEvents();
                expect(global.fetch.mock.calls.length, `Http ${status}`).to.equal(kept ? 1 : 0);
            }
        });

        it("are sent once each when resent while one is still on its way", async () => {
            const abhaService = service();
            global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
            await abhaService.recordEvent(EVENT);
            let answer;
            global.fetch = jest.fn(() => new Promise((resolve) => { answer = resolve; }));
            const first = abhaService.resendUnsentEvents();
            await until(() => global.fetch.mock.calls.length === 1);
            await abhaService.resendUnsentEvents();
            expect(global.fetch.mock.calls.length).to.equal(1);
            answer(reply(201, {}));
            await first;
        });

        it("are dropped when the phone's data is cleared for another user", async () => {
            global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
            await service().recordEvent(EVENT);
            await AbhaService.clearUnsentEvents();
            global.fetch = jest.fn(async () => reply(201, {}));
            await service().resendUnsentEvents();
            expect(global.fetch.mock.calls.length).to.equal(0);
        });

        describe("where they are kept", () => {
            const SERVICE = "avni.abha.unsentEvents";
            const offline = () => { global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); }); };
            const keptInKeychain = () => JSON.parse(mockKeychainStore.get(SERVICE) || "[]");
            const eventNumbered = (n) => ({...EVENT, uuid: `ev-${n}`});

            it("are in the Android keychain under their own name, never in AsyncStorage", async () => {
                AsyncStorage.setItem.mockClear();
                AsyncStorage.multiSet.mockClear();
                offline();
                await service().recordEvent(EVENT);

                expect(keptInKeychain()).to.deep.equal([EVENT]);
                expect(await AsyncStorage.getItem(SERVICE)).to.equal(null);
                expect(AsyncStorage.setItem.mock.calls.length + AsyncStorage.multiSet.mock.calls.length).to.equal(0);
            });

            // The database key is the keychain entry with no service name: no ABHA call may read or replace it.
            it("never touch the keychain entry the database key is kept in", async () => {
                offline();
                await service().recordEvent(EVENT);
                await service().resendUnsentEvents();
                await AbhaService.clearUnsentEvents();

                [Keychain.getGenericPassword, Keychain.setGenericPassword, Keychain.resetGenericPassword].forEach((fn) =>
                    expect(fn.mock.calls.length).to.be.greaterThan(0));
                expect(Keychain.getGenericPassword.mock.calls.every(([options]) => options.service === SERVICE)).to.equal(true);
                expect(Keychain.resetGenericPassword.mock.calls.every(([options]) => options.service === SERVICE)).to.equal(true);
                expect(Keychain.setGenericPassword.mock.calls.every(([, , options]) => options.service === SERVICE)).to.equal(true);
            });

            it("are moved out of AsyncStorage, where an older app kept them, on the first read, and sent", async () => {
                await AsyncStorage.setItem(SERVICE, JSON.stringify([EVENT]));
                offline();
                await service().resendUnsentEvents();

                expect(await AsyncStorage.getItem(SERVICE)).to.equal(null);
                expect(keptInKeychain()).to.deep.equal([EVENT]);

                global.fetch = jest.fn(async () => reply(201, {}));
                await service().resendUnsentEvents();
                expect(global.fetch.mock.calls.length).to.equal(1);
                expect(JSON.parse(global.fetch.mock.calls[0][1].body)).to.deep.equal(EVENT);
                expect(keptInKeychain()).to.deep.equal([]);
            });

            it("are moved once: a record in both places is kept once, and one already moved is not moved again", async () => {
                const older = eventNumbered(0);
                mockKeychainStore.set(SERVICE, JSON.stringify([EVENT]));
                await AsyncStorage.setItem(SERVICE, JSON.stringify([older, EVENT]));
                offline();

                await service().keepEvent(eventNumbered(2));
                await service().resendUnsentEvents();

                expect(keptInKeychain().map((event) => event.uuid)).to.deep.equal(["ev-0", "ev-1", "ev-2"]);
                expect(await AsyncStorage.getItem(SERVICE)).to.equal(null);
            });

            it("are kept in AsyncStorage still when the keychain cannot take them, to move on a later read", async () => {
                await AsyncStorage.setItem(SERVICE, JSON.stringify([EVENT]));
                Keychain.setGenericPassword.mockImplementationOnce(async () => { throw new Error("keystore locked"); });
                jest.spyOn(General, "logWarn").mockImplementation(() => {});
                offline();
                await service().resendUnsentEvents();
                expect(await AsyncStorage.getItem(SERVICE)).to.not.equal(null);

                await service().resendUnsentEvents();
                expect(await AsyncStorage.getItem(SERVICE)).to.equal(null);
                expect(keptInKeychain()).to.deep.equal([EVENT]);
            });

            it("are still read from the keychain when AsyncStorage cannot be read", async () => {
                offline();
                await service().recordEvent(EVENT);
                AsyncStorage.getItem.mockImplementationOnce(async () => { throw new Error("storage unreadable"); });

                global.fetch = jest.fn(async () => reply(201, {}));
                await service().resendUnsentEvents();
                expect(global.fetch.mock.calls.length).to.equal(1);
            });

            it("are at most 500: the oldest go first, with a warning and a Bugsnag report that give only how many", async () => {
                const logged = captureLogs();
                const reported = bugsnagReports();
                offline();
                const abhaService = service();
                for (let n = 1; n <= 502; n++) await abhaService.keepEvent(eventNumbered(n));

                const kept = keptInKeychain().map((event) => event.uuid);
                expect(kept).to.have.length(500);
                expect(kept[0]).to.equal("ev-3");
                expect(kept[499]).to.equal("ev-502");
                const warnings = logged.filter((args) => asText(args[1]).includes("dropped"));
                const line = "ABHA audit records over the limit of 500: 1 oldest dropped";
                expect(warnings.map((args) => args[1])).to.deep.equal([line, line]);
                expect(reported()).to.deep.equal([line, line]);
                [...logged.flat(), ...reported()].forEach((arg) => [...PATIENT_DETAILS, "ev-1", "ev-2"].forEach((detail) =>
                    expect(asText(arg)).to.not.contain(detail)));
            });

            it("that could not be kept reach Bugsnag as a count, never the record", async () => {
                captureLogs();
                const reported = bugsnagReports();
                Keychain.setGenericPassword.mockImplementationOnce(async () => { throw new Error("keystore locked"); });

                await service().keepEvent(EVENT);

                expect(reported()).to.deep.equal(["ABHA audit records not kept on the phone: 1"]);
            });

            it("at the limit, when the write fails, are reported as not kept, never as the oldest dropped", async () => {
                captureLogs();
                mockKeychainStore.set(SERVICE, JSON.stringify(Array.from({length: 500}, (x, n) => eventNumbered(n))));
                const reported = bugsnagReports();
                Keychain.setGenericPassword.mockImplementationOnce(async () => { throw new Error("keystore locked"); });

                await service().keepEvent(eventNumbered(500));

                expect(reported()).to.deep.equal(["ABHA audit records not kept on the phone: 1"]);
                expect(keptInKeychain()).to.have.length(500);
                expect(keptInKeychain()[0].uuid).to.equal("ev-0");
            });

            it("tell Bugsnag nothing when they are only sent, kept or forgotten as usual", async () => {
                captureLogs();
                const reported = bugsnagReports();
                offline();
                await service().recordEvent(EVENT);
                global.fetch = jest.fn(async () => reply(201, {}));
                await service().resendUnsentEvents();

                expect(reported()).to.deep.equal([]);
            });

            // A write replaces whatever could not be read, so the records in it are lost.
            it("that cannot be read back are reported before a write replaces them", async () => {
                captureLogs();
                const reported = bugsnagReports();
                mockKeychainStore.set(SERVICE, "{not json");
                offline();

                await service().keepEvent(EVENT);

                expect(reported()).to.deep.equal(["Unsent ABHA audit records unreadable: lost"]);
                expect(keptInKeychain()).to.deep.equal([EVENT]);
            });

            it("are still sent when the keychain cannot be read or written, with a warning that they are not kept", async () => {
                const logged = captureLogs();
                const [read, write] = [Keychain.getGenericPassword.getMockImplementation(), Keychain.setGenericPassword.getMockImplementation()];
                Keychain.getGenericPassword.mockImplementation(() => { throw new Error("keystore locked"); });
                Keychain.setGenericPassword.mockImplementation(async () => { throw new Error("keystore locked"); });
                try {
                    global.fetch = jest.fn(async () => reply(201, {}));
                    expect(await service().recordEvent(EVENT)).to.equal(true);
                    expect(global.fetch.mock.calls.length).to.equal(1);
                    await service().resendUnsentEvents();
                    expect(global.fetch.mock.calls.length).to.equal(1);
                    await service().keepEvent(EVENT);
                } finally {
                    Keychain.getGenericPassword.mockImplementation(read);
                    Keychain.setGenericPassword.mockImplementation(write);
                }
                const lines = logged.map((args) => args[1]);
                expect(lines).to.include("ABHA audit records could not be kept on the phone");
                expect(lines).to.include("Unsent ABHA audit records could not be read");
            });

            // The entry exists only while records are unsent: the last one sent or dropped removes it, never leaves "[]".
            it("leave no keychain entry once none is left unsent", async () => {
                offline();
                await service().recordEvent(EVENT);
                expect(mockKeychainStore.has(SERVICE)).to.equal(true);

                global.fetch = jest.fn(async () => reply(201, {}));
                await service().resendUnsentEvents();

                expect(mockKeychainStore.has(SERVICE)).to.equal(false);
                expect(Keychain.setGenericPassword.mock.calls.some(([, password]) => password === "[]")).to.equal(false);
            });

            it("are cleared from the keychain and from where an older app kept them, and clearing never rejects", async () => {
                offline();
                await service().recordEvent(EVENT);
                await AsyncStorage.setItem(SERVICE, JSON.stringify([eventNumbered(0)]));

                await AbhaService.clearUnsentEvents();

                expect(mockKeychainStore.has(SERVICE)).to.equal(false);
                expect(await AsyncStorage.getItem(SERVICE)).to.equal(null);

                const logged = captureLogs();
                Keychain.resetGenericPassword.mockImplementationOnce(() => { throw new Error("keystore locked"); });
                await AbhaService.clearUnsentEvents();
                expect(logged.map((args) => args[1])).to.include("Unsent ABHA audit records could not be cleared");
            });
        });
    });

    it("drops a record the server refuses, since sending it again cannot succeed", async () => {
        const abhaService = service();
        global.fetch = jest.fn(async () => reply(403, {code: "ABHA_DISABLED"}));
        expect(await abhaService.recordEvent(EVENT)).to.equal(false);

        global.fetch = jest.fn(async () => reply(201, {}));
        await abhaService.resendUnsentEvents();
        expect(global.fetch.mock.calls.length).to.equal(0);
    });

    it("tells Bugsnag of each record dropped on the server's refusal, as a count and the answer, never the record", async () => {
        captureLogs();
        const reported = bugsnagReports();
        for (const status of [400, 403, 409, 401, 404, 429, 500]) {
            mockKeychainStore.clear();
            global.fetch = jest.fn(async () => reply(status, {code: "SOME_CODE"}));
            await service().recordEvent(EVENT);
        }

        expect(reported()).to.deep.equal([400, 403, 409].map((status) => `ABHA audit records refused by the server (Http ${status}): 1 dropped`));
    });

    it("never logs the record's ABHA number, address or Eka's patient ID, sent or not", async () => {
        const logged = captureLogs();
        const abhaService = service();
        global.fetch = jest.fn(async () => reply(201, {}));
        await abhaService.recordEvent(EVENT);
        global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
        await abhaService.recordEvent(EVENT);
        global.fetch = jest.fn(async () => reply(400, {code: null}));
        await abhaService.resendUnsentEvents();

        expect(logged.length).to.be.greaterThan(0);
        logged.forEach((args) => args.forEach((arg) => PATIENT_DETAILS.forEach((detail) =>
            expect(asText(arg)).to.not.contain(detail))));
    });

    describe("the ABHA card file", () => {
        const downloaded = (status, body = {}) => ({info: () => ({status}), path: () => "/cache/abha-card-x.png", json: async () => body});

        beforeEach(() => {
            mockUnlink.mockClear();
            mockReadDir.mockClear();
            downloadWithAuth.mockReset();
        });

        it("fetches the card for the subject with the user's login into the cache folder and returns the file path", async () => {
            downloadWithAuth.mockResolvedValue(downloaded(200));

            const path = await service().getCardFile("s-1");

            expect(path).to.equal("/cache/abha-card-x.png");
            const [, , url, target, progress] = downloadWithAuth.mock.calls[0];
            expect(url).to.equal("https://server/abha/card?subjectUUID=s-1");
            expect(target.startsWith("/cache/")).to.equal(true);
            expect(target).to.contain("abha-card");
            expect(progress).to.equal(null);
            expect(mockUnlink.mock.calls.length).to.equal(0);
        });

        // The server serves the card of the ABHA named, not of a later lookup of another. In a header, so no request log
        // on the way holds it; an older server ignores it.
        it("names the ABHA it wants the card of in a header, never in the address", async () => {
            downloadWithAuth.mockResolvedValue(downloaded(200));

            await service().getCardFile("s-1", "4533");
            await service().getCardFile("s-1", null);
            await service().getCardFile("s-1", "45-33");

            const [, , url, , , headers] = downloadWithAuth.mock.calls[0];
            expect(url).to.equal("https://server/abha/card?subjectUUID=s-1");
            expect(headers).to.deep.equal({"X-Abha-Last-Four": "4533"});
            expect(downloadWithAuth.mock.calls[1][5]).to.deep.equal({});
            expect(downloadWithAuth.mock.calls[2][5]).to.deep.equal({});
        });

        // An ABHA made with a mobile number has no number: it is named by its address, never in the request's address.
        it("names an ABHA with no number by its address in a header, and only by its number when it has one", async () => {
            downloadWithAuth.mockResolvedValue(downloaded(200));

            await service().getCardFile("s-1", null, " asha@abdm ");
            await service().getCardFile("s-1", "4533", "asha@abdm");

            expect(downloadWithAuth.mock.calls[0][2]).to.equal("https://server/abha/card?subjectUUID=s-1");
            expect(downloadWithAuth.mock.calls[0][5]).to.deep.equal({"X-Abha-Address": "asha@abdm"});
            expect(downloadWithAuth.mock.calls[1][5]).to.deep.equal({"X-Abha-Last-Four": "4533"});
        });

        it("reads no ABHA card only from the server's code: a 404 with no code is a general failure", async () => {
            downloadWithAuth.mockResolvedValue(downloaded(404, {code: "ABHA_NO_CARD"}));
            expect(AbhaError.messageKey(await failureOf(service().getCardFile("s-1")))).to.equal("abhaNoCard");
            downloadWithAuth.mockResolvedValue(downloaded(404, "<html>Not Found</html>"));
            expect(AbhaError.messageKey(await failureOf(service().getCardFile("s-1")))).to.equal("abhaError");
            expect(AbhaError.messageKey(new AbhaError(null, 404))).to.equal("abhaError");
        });

        it("first deletes card files a closed card screen left in the cache folder, and nothing else there", async () => {
            mockReadDir.mockResolvedValueOnce([
                {name: "abha-card-1f2e.png", path: "/cache/abha-card-1f2e.png"},
                {name: "abha-card-9a8b.png", path: "/cache/abha-card-9a8b.png"},
                {name: "profile-pic.png", path: "/cache/profile-pic.png"},
                {name: "abha-card-notes.txt", path: "/cache/abha-card-notes.txt"},
            ]);
            downloadWithAuth.mockResolvedValue(downloaded(200));

            await service().getCardFile("s-1");

            expect(mockReadDir.mock.calls[0][0]).to.equal("/cache");
            expect(mockUnlink.mock.calls.map(([path]) => path)).to.deep.equal(["/cache/abha-card-1f2e.png", "/cache/abha-card-9a8b.png"]);
            expect(mockUnlink.mock.invocationCallOrder[1]).to.be.lessThan(downloadWithAuth.mock.invocationCallOrder[0]);
        });

        it("still fetches the card when the cache folder cannot be read", async () => {
            mockReadDir.mockRejectedValueOnce(new Error("ENOENT"));
            downloadWithAuth.mockResolvedValue(downloaded(200));
            expect(await service().getCardFile("s-1")).to.equal("/cache/abha-card-x.png");
        });

        it("getCardFileDeletesFileOnError", async () => {
            downloadWithAuth.mockResolvedValue(downloaded(404));

            const error = await failureOf(service().getCardFile("s-1"));

            expect(error).to.be.instanceOf(AbhaError);
            expect(error.status).to.equal(404);
            expect(mockUnlink.mock.calls.length).to.equal(1);
            expect(mockUnlink.mock.calls[0][0]).to.equal(downloadWithAuth.mock.calls[0][3]);
        });

        it("names each refusal from the file the server's answer was written to, and still deletes it", async () => {
            const refusals = [[403, "ABHA_NOT_YOURS"], [403, "ABHA_NO_PRIVILEGE"], [409, "ABHA_NOT_CONFIGURED"], [502, "ABHA_EKA_UNAVAILABLE"]];
            for (const [status, code] of refusals) {
                mockUnlink.mockClear();
                downloadWithAuth.mockResolvedValue(downloaded(status, {code}));
                const error = await failureOf(service().getCardFile("s-1"));
                expect(error, code).to.be.instanceOf(AbhaError);
                expect(error.code).to.equal(code);
                expect(error.status).to.equal(status);
                expect(mockUnlink.mock.calls.length).to.equal(1);
            }
        });

        it("deletes the file when the download itself fails, and passes the failure on", async () => {
            downloadWithAuth.mockRejectedValue(new Error("Network request failed"));

            const error = await failureOf(service().getCardFile("s-1"));

            expect(error.message).to.equal("Network request failed");
            expect(mockUnlink.mock.calls.length).to.equal(1);
        });

        it("gives the two new refusals their own messages", () => {
            expect(AbhaError.messageKey(new AbhaError("ABHA_NOT_YOURS", 403))).to.equal("abhaNotYours");
            expect(AbhaError.messageKey(new AbhaError("ABHA_NO_CARD", 404))).to.equal("abhaNoCard");
            expect(AbhaError.messageKey(new AbhaError("ABHA_DISABLED", 403))).to.equal("abhaDisabled");
            ["abhaNotYours", "abhaNoCard"].forEach((key) => expect(en.translations[key], key).to.be.a("string"));
        });
    });
});
