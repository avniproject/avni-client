import {SyncError} from "avni-models";
import {syncFailureReason} from "../../src/framework/errorHandling/SyncFailureReason";
import AuthenticationError, {NETWORK_ERROR} from "../../src/service/AuthenticationError";
import ServerError from "../../src/service/ServerError";
import MediaUploadError from "../../src/framework/errorHandling/MediaUploadError";
import {SYNC_TIMEOUT_ERROR} from "../../src/framework/errorHandling/ExpectedTransientNetworkError";

// sync_failed is now the only record of a failure Bugsnag no longer sees, so every class must carry a reason.
describe("syncFailureReason", () => {
    it("names a sign-in failure by its code", () => {
        expect(syncFailureReason(new AuthenticationError(NETWORK_ERROR, "Network error"))).toBe("NetworkError");
        expect(syncFailureReason(new AuthenticationError(undefined, "x"))).toBe("AuthenticationError");
    });

    it("names a server failure by its status", () => {
        expect(syncFailureReason(new ServerError({status: 502}))).toBe("Http 502");
    });

    it("names what a media upload failed on", () => {
        expect(syncFailureReason(new MediaUploadError(new Error('Unable to resolve host "s3.amazonaws.com": No address')))).toBe("MediaUploadError: Unable to resolve host");
    });

    it("names a sync error by its code", () => {
        const error = new SyncError("SYNC_ERR_42", "boom");
        expect(syncFailureReason(error)).toBe(`SyncError: ${error.errorCode}`);
    });

    it("names each transient network signature", () => {
        expect(syncFailureReason(new Error(SYNC_TIMEOUT_ERROR))).toBe("syncTimeoutError");
        expect(syncFailureReason(new TypeError("Network request failed"))).toBe("Network request failed");
    });

    it("falls back to the error's name, never its free text", () => {
        expect(syncFailureReason(new TypeError("Cannot read property 'name' of subject 1234"))).toBe("TypeError");
        expect(syncFailureReason(null)).toBe("unknown");
    });

    it("stays within Firebase's parameter length", () => {
        expect(syncFailureReason(new AuthenticationError("x".repeat(300), "x")).length).toBe(100);
    });
});
