import {catchmentUploadBlockers, BLOCKER_KEYS} from '../../src/utility/CatchmentUploadGuard';

const clean = {lastSyncCompleted: true, hasUnsyncedTxData: false, hasPendingReset: false};

describe('catchmentUploadBlockers', () => {
    it('allows the upload when the last sync finished, nothing is unsaved and no reset is pending', () => {
        expect(catchmentUploadBlockers(clean)).toEqual([]);
    });

    it('blocks when the last sync did not finish', () => {
        expect(catchmentUploadBlockers({...clean, lastSyncCompleted: false}))
            .toEqual([BLOCKER_KEYS.lastSyncIncomplete]);
    });

    it('blocks when there is unsaved local data', () => {
        expect(catchmentUploadBlockers({...clean, hasUnsyncedTxData: true}))
            .toEqual([BLOCKER_KEYS.unsavedData]);
    });

    it('blocks when a reset is pending — the dump would carry a reset row and the data it has not discarded', () => {
        expect(catchmentUploadBlockers({...clean, hasPendingReset: true}))
            .toEqual([BLOCKER_KEYS.resetPending]);
    });

    it('reports every reason at once, so the worker is not sent round twice', () => {
        expect(catchmentUploadBlockers({lastSyncCompleted: false, hasUnsyncedTxData: true, hasPendingReset: true}))
            .toEqual([BLOCKER_KEYS.lastSyncIncomplete, BLOCKER_KEYS.unsavedData, BLOCKER_KEYS.resetPending]);
    });

    it('fails closed on missing input rather than allowing the upload', () => {
        expect(catchmentUploadBlockers({})).toContain(BLOCKER_KEYS.lastSyncIncomplete);
        expect(catchmentUploadBlockers(undefined)).toContain(BLOCKER_KEYS.lastSyncIncomplete);
    });
});
