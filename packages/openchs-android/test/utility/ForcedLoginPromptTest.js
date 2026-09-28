import {buildForcedLoginPromptParams, NO_USER_REASON} from "../../src/utility/ForcedLoginPrompt";

const NOW = Date.parse("2026-09-22T12:00:00Z");

describe("buildForcedLoginPromptParams", () => {
    it("records the reason and whether the device believed it was online", () => {
        const p = buildForcedLoginPromptParams({errorCode: "NetworkError", isConnected: true, now: NOW});
        expect(p.error_code).toBe("NetworkError");
        // Stringified: Firebase on Android drops Booleans from an event bundle.
        expect(p.is_connected).toBe("true");
    });

    it("carries the no-user reason from the launch path", () => {
        expect(buildForcedLoginPromptParams({errorCode: NO_USER_REASON, now: NOW}).error_code).toBe("no_user");
    });

    it("reports minutes since the last completed sync", () => {
        const p = buildForcedLoginPromptParams({
            errorCode: "Http 403",
            lastCompletedSyncAt: NOW - 90 * 60000,
            now: NOW
        });
        expect(p.minutes_since_last_sync).toBe(90);
    });

    it("reports token age, which is what exposes a clock that moved after login", () => {
        const p = buildForcedLoginPromptParams({
            errorCode: "NotAuthorizedException",
            tokenIssuedAt: NOW - 45 * 60000,
            now: NOW
        });
        expect(p.token_age_minutes).toBe(45);
    });

    it("keeps a zero clock drift, which is a real reading and not a missing one", () => {
        expect(buildForcedLoginPromptParams({errorCode: "No User", clockDriftSeconds: 0, now: NOW})
            .cognito_clock_drift_seconds).toBe(0);
    });

    it("stringifies a false connection rather than dropping it", () => {
        expect(buildForcedLoginPromptParams({errorCode: "No User", isConnected: false, now: NOW})
            .is_connected).toBe("false");
    });

    it("carries a negative clock drift unchanged", () => {
        expect(buildForcedLoginPromptParams({errorCode: "No User", clockDriftSeconds: -4, now: NOW})
            .cognito_clock_drift_seconds).toBe(-4);
    });

    it("omits fields it could not read rather than sending nulls", () => {
        const p = buildForcedLoginPromptParams({errorCode: "NetworkError", now: NOW});
        expect(p).not.toHaveProperty("minutes_since_last_sync");
        expect(p).not.toHaveProperty("token_age_minutes");
        expect(p).not.toHaveProperty("cognito_clock_drift_seconds");
        expect(p).not.toHaveProperty("idp_type");
    });

    it("falls back to a named code when the SDK gave none", () => {
        expect(buildForcedLoginPromptParams({errorCode: undefined, now: NOW}).error_code).toBe("unknown");
    });

    it("keeps a numeric code rather than relabelling it unknown", () => {
        expect(buildForcedLoginPromptParams({errorCode: 0, now: NOW}).error_code).toBe("0");
        expect(buildForcedLoginPromptParams({errorCode: 500, now: NOW}).error_code).toBe("500");
    });

    it("includes idp_type so the Keycloak path stays distinguishable", () => {
        expect(buildForcedLoginPromptParams({errorCode: "No User", idpType: "cognito", now: NOW}).idp_type).toBe("cognito");
    });
});

jest.mock("../../src/utility/Analytics", () => ({
    firebaseEvents: {FORCED_LOGIN_PROMPT: "forced_login_prompt"},
    logEvent: jest.fn()
}));
jest.mock("../../src/service/SettingsService", () => ({__esModule: true, default: "SettingsService"}));
jest.mock("../../src/service/SyncTelemetryService", () => ({__esModule: true, default: "SyncTelemetryService"}));
jest.mock("../../src/service/AuthService", () => ({__esModule: true, default: "AuthService"}));

describe("recording a forced login prompt", () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    const NetInfo = require("@react-native-community/netinfo").default;
    const {logEvent} = require("../../src/utility/Analytics");
    const {logForcedLoginPrompt, logForcedLoginPromptAtLaunch} = require("../../src/utility/ForcedLoginPrompt");
    const SessionRecord = require("../../src/service/SessionRecord").default;

    const lastSyncEnd = new Date(Date.now() - 30 * 60000);
    const contextWith = ({clock = {}, lastSync = {syncEndTime: lastSyncEnd}, settings = {idpType: "cognito"}, throwing = []} = {}) => ({
        getService: (name) => {
            if (throwing.includes(name)) throw new Error(`${name} not ready`);
            return {
                SettingsService: {getSettings: () => settings},
                SyncTelemetryService: {getLatestCompletedSync: () => lastSync},
                AuthService: {getAuthProviderService: () => ({getCachedSessionClockInfo: () => clock})}
            }[name];
        }
    });
    const loggedParams = () => logEvent.mock.calls.map(([, params]) => params);

    beforeEach(async () => {
        logEvent.mockClear();
        await AsyncStorage.clear();
        NetInfo.fetch.mockImplementation(() => Promise.resolve({isConnected: true}));
    });

    it("reads the connection when the prompt happens, not a value cached before the sync", async () => {
        NetInfo.fetch.mockImplementation(() => Promise.resolve({isConnected: false}));
        await logForcedLoginPrompt(contextWith(), {errorCode: "Http 401"});
        expect(loggedParams()).toEqual([expect.objectContaining({error_code: "Http 401", is_connected: "false", idp_type: "cognito"})]);
    });

    it("falls back to the recorded clock once the SDK has deleted its cached token", async () => {
        await SessionRecord.recordClock({tokenIssuedAt: Date.now() - 45 * 60000, clockDriftSeconds: -4});
        await logForcedLoginPrompt(contextWith({clock: {}}), {errorCode: "NotAuthorizedException"});
        expect(loggedParams()[0]).toMatchObject({token_age_minutes: 45, cognito_clock_drift_seconds: -4});
    });

    it("prefers the SDK's live cache when it is still there", async () => {
        await SessionRecord.recordClock({tokenIssuedAt: Date.now() - 500 * 60000, clockDriftSeconds: 9});
        await logForcedLoginPrompt(contextWith({clock: {tokenIssuedAt: Date.now() - 10 * 60000, clockDriftSeconds: 0}}), {errorCode: "Http 401"});
        expect(loggedParams()[0]).toMatchObject({token_age_minutes: 10, cognito_clock_drift_seconds: 0});
    });

    it("loses only the field a failing service lookup was for", async () => {
        await logForcedLoginPrompt(contextWith({throwing: ["SyncTelemetryService", "AuthService"]}), {errorCode: "Http 401"});
        expect(loggedParams()).toHaveLength(1);
        expect(loggedParams()[0]).not.toHaveProperty("minutes_since_last_sync");
        expect(loggedParams()[0].idp_type).toBe("cognito");
    });

    it("reads a sync end time stored as a string rather than a Date", async () => {
        await logForcedLoginPrompt(contextWith({lastSync: {syncEndTime: lastSyncEnd.toISOString()}}), {errorCode: "Http 401"});
        expect(loggedParams()[0].minutes_since_last_sync).toBe(30);
    });

    describe("at launch", () => {
        it("records a session the user did not end, once rather than on every launch", async () => {
            await SessionRecord.established();
            await logForcedLoginPromptAtLaunch(contextWith(), {userExists: false, databaseSynced: true});
            await logForcedLoginPromptAtLaunch(contextWith(), {userExists: false, databaseSynced: true});
            expect(loggedParams()).toEqual([expect.objectContaining({error_code: "no_user"})]);
        });

        it("records nothing after a deliberate sign-out or data deletion", async () => {
            await SessionRecord.established();
            await SessionRecord.ended();
            await logForcedLoginPromptAtLaunch(contextWith(), {userExists: false, databaseSynced: true});
            expect(logEvent).not.toHaveBeenCalled();
        });

        it("treats a synced device that predates the record as having had a session", async () => {
            await logForcedLoginPromptAtLaunch(contextWith(), {userExists: false, databaseSynced: true});
            expect(loggedParams()).toHaveLength(1);
        });

        it("records nothing on a first run", async () => {
            await logForcedLoginPromptAtLaunch(contextWith(), {userExists: false, databaseSynced: false});
            expect(logEvent).not.toHaveBeenCalled();
        });

        it("backfills the record for a device that upgraded with a live session", async () => {
            await logForcedLoginPromptAtLaunch(contextWith(), {userExists: true, databaseSynced: true});
            expect(await SessionRecord.getState()).toBe("established");
            expect(logEvent).not.toHaveBeenCalled();
        });
    });
});
