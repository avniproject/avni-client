const mockLogEvent = jest.fn();
jest.mock("../../src/utility/Analytics", () => ({
    firebaseEvents: {SYNC_FAILED: 'sync_failed'},
    formatLocalTimestamp: (time) => `local:${time}`,
    logEvent: (...args) => mockLogEvent(...args)
}));

import {SyncActions} from "../../src/action/SyncActions";

describe("SyncActions.onError sync_failed params (PE-217)", () => {
    beforeEach(() => mockLogEvent.mockClear());

    it("adds the durations of the phases the sync finished", () => {
        SyncActions.onError({startTime: Date.now() - 5000}, {
            errorCode: 'syncTimeoutError',
            phaseParams: {media_duration_ms: 2000, push_duration_ms: 1500}
        });

        const [name, params] = mockLogEvent.mock.calls[0];
        expect(name).toBe('sync_failed');
        expect(params).toMatchObject({
            error_code: 'syncTimeoutError',
            media_duration_ms: 2000,
            push_duration_ms: 1500
        });
        expect(params).not.toHaveProperty('pull_duration_ms');
    });

    it("still logs when no phases are sent", () => {
        SyncActions.onError({startTime: Date.now()}, {errorCode: 'internetConnectionError'});
        const [, params] = mockLogEvent.mock.calls[0];
        expect(params).not.toHaveProperty('push_duration_ms');
        expect(params.error_code).toBe('internetConnectionError');
    });
});
