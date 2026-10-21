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
jest.mock("react-native-fs", () => ({unlink: (...args) => mockUnlink(...args), exists: jest.fn(() => Promise.resolve(true))}));
jest.mock("../../src/service/AuthAwareDownload", () => ({downloadWithAuth: jest.fn()}));
jest.mock("react-native-blob-util", () => ({fs: {dirs: {CacheDir: "/cache"}}}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {downloadWithAuth} from "../../src/service/AuthAwareDownload";
import AbhaService from "../../src/service/AbhaService";
import AbhaError from "../../src/service/AbhaError";
import AuthenticationError from "../../src/service/AuthenticationError";
import General from "../../src/utility/General";
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
    abhaNumber: ABHA_NUMBER, abhaAddress: "asha.rao@sbx", ekaOid: "oid-77", ekaTxnId: "txn-1",
    consentGivenAt: "2026-10-20T04:00:00.000Z", occurredAt: "2026-10-20T04:01:00.000Z",
};
const PATIENT_DETAILS = [ABHA_NUMBER, ABHA_DIGITS, "asha.rao@sbx", "oid-77"];

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

// Lets the promises already queued run, until the check holds.
async function until(check) {
    for (let i = 0; i < 50 && !check(); i++) await new Promise((resolve) => setImmediate(resolve));
    if (!check()) throw new Error("never happened");
}

describe("AbhaServiceTest", () => {
    beforeEach(async () => await AsyncStorage.clear());
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

    it("fetches today's check-ins for the user's health centre, refusals mapped the same way", async () => {
        const checkIns = [{uuid: "c-1", abhaAddress: "asha@sbx", abhaNumber: null, tokenNumber: 1, checkedInAt: "2026-10-20T04:00:00Z", subjectUUID: null}];
        global.fetch = jest.fn(async () => reply(200, checkIns));
        expect(await service().getCheckIns()).to.deep.equal(checkIns);
        expect(global.fetch.mock.calls[0][0]).to.equal("https://server/abha/checkIns");

        global.fetch = jest.fn(async () => reply(403, {code: "ABHA_NO_HEALTH_CENTRE"}));
        expect((await failureOf(service().getCheckIns())).code).to.equal("ABHA_NO_HEALTH_CENTRE");
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
                await AsyncStorage.clear();
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
    });

    it("drops a record the server refuses, since sending it again cannot succeed", async () => {
        const abhaService = service();
        global.fetch = jest.fn(async () => reply(403, {code: "ABHA_DISABLED"}));
        expect(await abhaService.recordEvent(EVENT)).to.equal(false);

        global.fetch = jest.fn(async () => reply(201, {}));
        await abhaService.resendUnsentEvents();
        expect(global.fetch.mock.calls.length).to.equal(0);
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

        it("reads no ABHA card only from the server's code: a 404 with no code is a general failure", async () => {
            downloadWithAuth.mockResolvedValue(downloaded(404, {code: "ABHA_NO_CARD"}));
            expect(AbhaError.messageKey(await failureOf(service().getCardFile("s-1")))).to.equal("abhaNoCard");
            downloadWithAuth.mockResolvedValue(downloaded(404, "<html>Not Found</html>"));
            expect(AbhaError.messageKey(await failureOf(service().getCardFile("s-1")))).to.equal("abhaError");
            expect(AbhaError.messageKey(new AbhaError(null, 404))).to.equal("abhaError");
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
