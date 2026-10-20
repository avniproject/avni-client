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

import AbhaService from "../../src/service/AbhaService";
import AbhaError from "../../src/service/AbhaError";
import AuthenticationError from "../../src/service/AuthenticationError";
import General from "../../src/utility/General";

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

describe("AbhaServiceTest", () => {
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
});
