import Client from "amazon-cognito-identity-js/src/Client";
import AuthenticationError, {
    authErrCodeFromCognitoError,
    HTTP_401,
    HTTP_403,
    NETWORK_ERROR,
    NO_USER,
    NOT_AUTHORIZED,
    requiresReLogin,
    UNREADABLE_AUTH_RESPONSE
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

    it("keeps the user signed in when Cognito's reply could not be read", () => {
        expect(requiresReLogin(new AuthenticationError(UNREADABLE_AUTH_RESPONSE, "x"))).toBe(false);
    });

    it("sends the user to login for an unrecognised code", () => {
        // Cognito service exceptions arrive straight from data.__type and cannot be enumerated;
        // treating an unknown one as recoverable strands the user with no way back to login.
        expect(requiresReLogin(new AuthenticationError("UserNotFoundException", "x"))).toBe(true);
        expect(requiresReLogin(new AuthenticationError("PasswordResetRequiredException", "x"))).toBe(true);
    });

    it("sends the user to login when the SDK reported no code at all", () => {
        // getSession's own "Please authenticate" failures are plain Errors with no .code,
        // so authErrCode lands undefined.
        expect(requiresReLogin(new AuthenticationError(undefined, "Local storage is missing an ID Token, Please authenticate"))).toBe(true);
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

// Drives the SDK's own request() rather than reading its source, so a missing or relocated file fails instead of passing.
describe("Cognito SDK error shapes", () => {
    const originalFetch = global.fetch;
    afterEach(() => global.fetch = originalFetch);

    const requestError = () => new Promise((resolve) =>
        new Client("ap-south-1").request("InitiateAuth", {}, (err) => resolve(err)));

    it("spells its network failure the way NETWORK_ERROR expects", async () => {
        // The original guard tested for 'NetworkingError', a spelling the SDK dropped in 2019, and nothing noticed.
        global.fetch = jest.fn(() => Promise.reject(new TypeError("Network request failed")));
        expect((await requestError()).code).toBe(NETWORK_ERROR);
    });

    it("reports a reply it cannot parse as a codeless TypeError", async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: false,
            status: 502,
            headers: {get: () => null},
            json: () => Promise.reject(new SyntaxError("Unexpected token <"))
        }));
        const err = await requestError();
        expect(err).toBeInstanceOf(TypeError);
        expect(err.code).toBeUndefined();
    });

    it("reports a rejected session with its service exception code", async () => {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: false,
            status: 400,
            headers: {get: () => null},
            json: () => Promise.resolve({__type: "NotAuthorizedException", message: "Refresh Token has expired"})
        }));
        expect((await requestError()).code).toBe(NOT_AUTHORIZED);
    });
});

describe("authErrCodeFromCognitoError", () => {
    it("keeps the session when the SDK could not parse Cognito's reply", () => {
        const code = authErrCodeFromCognitoError(new TypeError("Cannot read property 'split' of undefined"));
        expect(code).toBe(UNREADABLE_AUTH_RESPONSE);
        expect(requiresReLogin(new AuthenticationError(code, "x"))).toBe(false);
    });

    it("still sends the user to login for the SDK's own Please-authenticate failures", () => {
        const code = authErrCodeFromCognitoError(new Error("Local storage is missing an ID Token, Please authenticate"));
        expect(requiresReLogin(new AuthenticationError(code, "x"))).toBe(true);
    });

    it("passes an SDK code through untouched", () => {
        expect(authErrCodeFromCognitoError({code: "NotAuthorizedException"})).toBe("NotAuthorizedException");
    });
});
