jest.mock("../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../src/framework/EnvironmentConfig", () => ({__esModule: true, default: {inNonDevMode: () => true}}));

import bugsnag from "../../src/utility/bugsnag";
import ErrorUtil from "../../src/framework/errorHandling/ErrorUtil";
import ErrorHandler from "../../src/utility/ErrorHandler";
import {RN_FETCH_FAILURE_MESSAGE} from "../../src/framework/errorHandling/ExpectedTransientNetworkError";

// The filter sits in the funnel so background sync and media upload are covered, not just the sync screen.
describe("ErrorUtil.notifyBugsnag", () => {
    beforeEach(() => bugsnag.notify.mockClear());

    it("does not report an expected transient network failure, whoever reports it", async () => {
        await ErrorUtil.notifyBugsnag(new TypeError(RN_FETCH_FAILURE_MESSAGE), "MediaQueueService");
        expect(bugsnag.notify).not.toHaveBeenCalled();
    });

    it("still hands the error back so callers chaining on it keep working", async () => {
        const error = new TypeError(RN_FETCH_FAILURE_MESSAGE);
        expect(await ErrorUtil.notifyBugsnag(error, "ErrorHandler")).toBe(error);
    });

    it("reports anything else", async () => {
        await ErrorUtil.notifyBugsnag(new TypeError("Cannot read property 'uuid' of undefined"), "SyncComponent");
        expect(bugsnag.notify).toHaveBeenCalledTimes(1);
    });

    it("reports a transient failure when the caller asks, as a crash does", async () => {
        await ErrorUtil.notifyBugsnag(new TypeError(RN_FETCH_FAILURE_MESSAGE), "ErrorHandler", {reportTransient: true});
        expect(bugsnag.notify).toHaveBeenCalledTimes(1);
    });

    it("leaves a background-sync network failure out", async () => {
        const callback = jest.fn();
        ErrorHandler.postError(new TypeError(RN_FETCH_FAILURE_MESSAGE), callback);
        await new Promise(setImmediate);
        expect(bugsnag.notify).not.toHaveBeenCalled();
        expect(callback).toHaveBeenCalled();
    });
});
