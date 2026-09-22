import fs from "fs";
import path from "path";
import AuthenticationError, {
    HTTP_401,
    HTTP_403,
    NETWORK_ERROR,
    NO_USER,
    NOT_AUTHORIZED,
    requiresReLogin
} from "../../src/service/AuthenticationError";

describe("requiresReLogin", () => {
    it("sends the user to login when the session is genuinely over", () => {
        [HTTP_401, NO_USER, NOT_AUTHORIZED].forEach(code =>
            expect(requiresReLogin(new AuthenticationError(code, "x"))).toBe(true));
    });

    it("keeps the user signed in when the network dropped", () => {
        expect(requiresReLogin(new AuthenticationError(NETWORK_ERROR, "Network error"))).toBe(false);
    });

    it("keeps the user signed in when the server refuses on permissions", () => {
        expect(requiresReLogin(new AuthenticationError(HTTP_403, "x"))).toBe(false);
    });

    it("does not send the user to login for an unrecognised code", () => {
        expect(requiresReLogin(new AuthenticationError("SomeFutureSdkCode", "x"))).toBe(false);
    });
});

describe("AuthenticationError shape", () => {
    // task/Sync.js read e.code for years; the constructor only ever set authErrCode.
    it("exposes the code as authErrCode and not as code", () => {
        const error = new AuthenticationError(NO_USER, "No user or needs login");
        expect(error.authErrCode).toBe(NO_USER);
        expect(error.code).toBeUndefined();
    });

    // Bugsnag groups by name; "Error" put every auth failure in one anonymous bucket.
    it("names itself so error reports can distinguish a sign-in failure", () => {
        expect(new AuthenticationError(NO_USER, "x").name).toBe("AuthenticationError");
    });

    it("is still catchable as an Error", () => {
        expect(new AuthenticationError(NO_USER, "x") instanceof Error).toBe(true);
    });
});

describe("Cognito SDK error-code canary", () => {
    // The original guard tested for 'NetworkingError', a spelling the SDK dropped in 2019,
    // so it never matched and nothing noticed. Fail loudly if the spelling moves again.
    it("still spells its network failure the way NETWORK_ERROR expects", () => {
        const client = fs.readFileSync(
            path.join(__dirname, "../../node_modules/amazon-cognito-identity-js/src/Client.js"), "utf8");
        expect(client).toContain(`err.code = '${NETWORK_ERROR}'`);
    });
});
