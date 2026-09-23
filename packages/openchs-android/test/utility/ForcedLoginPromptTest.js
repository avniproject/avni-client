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

    it("includes idp_type so the Keycloak path stays distinguishable", () => {
        expect(buildForcedLoginPromptParams({errorCode: "No User", idpType: "cognito", now: NOW}).idp_type).toBe("cognito");
    });
});
