import {
    isExpectedNonDefect,
    UPLOAD_STALLED_MESSAGE,
    isExpectedTransientNetworkError,
    RN_FETCH_FAILURE_MESSAGE,
    DNS_FAILURE_PREFIX,
    SYNC_TIMEOUT_ERROR
} from "../../src/framework/errorHandling/ExpectedTransientNetworkError";
import AuthenticationError, {NETWORK_ERROR, NO_USER, HTTP_401, HTTP_403, NOT_AUTHORIZED, UNREADABLE_AUTH_RESPONSE} from "../../src/service/AuthenticationError";
import MediaUploadError from "../../src/framework/errorHandling/MediaUploadError";
import {syncFailureReason} from "../../src/framework/errorHandling/SyncFailureReason";

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

describe("isExpectedNonDefect — forced re-login and stalled uploads are left out (#2159)", () => {
    [NO_USER, HTTP_401, NOT_AUTHORIZED, 'Authentication failure'].forEach((code) => {
        it(`excludes a login failure that sends the user to log in again: ${code}`, () => {
            expect(isExpectedNonDefect(new AuthenticationError(code, "x"))).toBe(true);
        });
    });

    it("still excludes everything the network gate excludes", () => {
        expect(isExpectedNonDefect(new Error(SYNC_TIMEOUT_ERROR))).toBe(true);
        expect(isExpectedNonDefect(new AuthenticationError(NETWORK_ERROR, "Network error"))).toBe(true);
    });

    it("excludes our upload stall, bare or wrapped for the sync dialog", () => {
        expect(isExpectedNonDefect(new Error(UPLOAD_STALLED_MESSAGE))).toBe(true);
        expect(isExpectedNonDefect(new MediaUploadError(new Error(UPLOAD_STALLED_MESSAGE)))).toBe(true);
    });

    it("reports a login failure with no reason code, which may be a defect", () => {
        expect(isExpectedNonDefect(new AuthenticationError(undefined, "x"))).toBe(false);
    });

    it("reports login failures that do not end the session", () => {
        expect(isExpectedNonDefect(new AuthenticationError(UNREADABLE_AUTH_RESPONSE, "x"))).toBe(false);
        expect(isExpectedNonDefect(new AuthenticationError(HTTP_403, "x"))).toBe(false);
    });

    it("reports a bare cancel, another media failure and an unrelated error", () => {
        expect(isExpectedNonDefect(new Error("canceled"))).toBe(false);
        expect(isExpectedNonDefect(new MediaUploadError(new Error("Media upload failed. HTTP Status:500. a.jpg")))).toBe(false);
        expect(isExpectedNonDefect(new TypeError("Cannot read property 'x' of undefined"))).toBe(false);
        expect(isExpectedNonDefect(null)).toBe(false);
    });

    it("records a stalled sync-time upload as a stall in the sync failure reason", () => {
        expect(syncFailureReason(new MediaUploadError(new Error(UPLOAD_STALLED_MESSAGE))))
            .toBe(`MediaUploadError: ${UPLOAD_STALLED_MESSAGE}`);
    });
});
