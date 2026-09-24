import {
    isExpectedTransientNetworkError,
    RN_FETCH_FAILURE_MESSAGE,
    DNS_FAILURE_PREFIX
} from "../../src/framework/errorHandling/ExpectedTransientNetworkError";
import {SYNC_TIMEOUT_ERROR} from "../../src/framework/http/requests";
import AuthenticationError, {NETWORK_ERROR, NO_USER, HTTP_403} from "../../src/service/AuthenticationError";

describe("isExpectedTransientNetworkError — excluded from Bugsnag", () => {
    it("excludes the per-page sync timeout", () => {
        expect(isExpectedTransientNetworkError(new Error(SYNC_TIMEOUT_ERROR))).toBe(true);
    });

    it("excludes React Native's fetch failure", () => {
        expect(isExpectedTransientNetworkError(new TypeError(RN_FETCH_FAILURE_MESSAGE))).toBe(true);
    });

    it("excludes a DNS failure, whose message carries the host", () => {
        expect(isExpectedTransientNetworkError(
            new Error(`${DNS_FAILURE_PREFIX} "s3.ap-south-1.amazonaws.com": No address associated with hostname`))).toBe(true);
    });

    it("excludes a Cognito network failure", () => {
        expect(isExpectedTransientNetworkError(new AuthenticationError(NETWORK_ERROR, "Network error"))).toBe(true);
    });
});

describe("isExpectedTransientNetworkError — still reported", () => {
    it("reports a genuine app defect", () => {
        expect(isExpectedTransientNetworkError(
            new TypeError("Cannot read property 'observations' of undefined"))).toBe(false);
    });

    it("reports a sign-in failure, which is a separate decision on the card", () => {
        expect(isExpectedTransientNetworkError(new AuthenticationError(NO_USER, "No user or needs login"))).toBe(false);
    });

    it("reports a permission refusal, which is not a network problem", () => {
        expect(isExpectedTransientNetworkError(new AuthenticationError(HTTP_403, "x"))).toBe(false);
    });

    it("reports an error whose message merely mentions the network", () => {
        // Substring matching would swallow real defects; only the DNS prefix is matched loosely.
        expect(isExpectedTransientNetworkError(
            new Error("Sync failed after Network request failed was handled"))).toBe(false);
    });

    it("tolerates a null or message-less error without claiming it is transient", () => {
        expect(isExpectedTransientNetworkError(null)).toBe(false);
        expect(isExpectedTransientNetworkError(undefined)).toBe(false);
        expect(isExpectedTransientNetworkError({})).toBe(false);
    });
});

describe("the timeout message is shared, not re-typed", () => {
    // requests.js raises it and this predicate matches it; a rename must break both together.
    it("matches the constant the http layer actually rejects with", () => {
        expect(SYNC_TIMEOUT_ERROR).toBe("syncTimeoutError");
    });
});
