import {SyncActions} from '../../src/action/SyncActions';

describe('SyncActions content-download warning latch', () => {
    it('starts false', () => {
        expect(SyncActions.getInitialState().contentDownloadWarning).toBe(false);
    });

    it('latches true when the contentNotDownloaded status message arrives', () => {
        const state = SyncActions.onMessageCallback(SyncActions.getInitialState(), {message: 'contentNotDownloaded'});
        expect(state.contentDownloadWarning).toBe(true);
    });

    it('stays latched across later status messages (so completion can surface it)', () => {
        let state = SyncActions.onMessageCallback(SyncActions.getInitialState(), {message: 'contentNotDownloaded'});
        state = SyncActions.onMessageCallback(state, {message: 'downloadForms'});
        expect(state.contentDownloadWarning).toBe(true);
    });

    it('does not latch for other messages', () => {
        const state = SyncActions.onMessageCallback(SyncActions.getInitialState(), {message: 'downloadForms'});
        expect(state.contentDownloadWarning).toBe(false);
    });

    it('resets at the start of the next sync (preSync)', () => {
        let state = SyncActions.onMessageCallback(SyncActions.getInitialState(), {message: 'contentNotDownloaded'});
        state = SyncActions.preSync(state);
        expect(state.contentDownloadWarning).toBe(false);
    });
});

describe('SyncActions reset-waiting latch', () => {
    it('starts false', () => {
        expect(SyncActions.getInitialState().resetWaitingWarning).toBe(false);
    });

    it('latches true when the sync says a reset is waiting for uploads, and stays latched to the end of the sync', () => {
        let state = SyncActions.onMessageCallback(SyncActions.getInitialState(), {message: 'resetWaitingOnUploads'});
        state = SyncActions.onMessageCallback(state, {message: 'downloadForms'});
        expect(state.resetWaitingWarning).toBe(true);
    });

    it('does not latch for other messages', () => {
        const state = SyncActions.onMessageCallback(SyncActions.getInitialState(), {message: 'contentNotDownloaded'});
        expect(state.resetWaitingWarning).toBe(false);
    });

    it('resets at the start of the next sync (preSync)', () => {
        let state = SyncActions.onMessageCallback(SyncActions.getInitialState(), {message: 'resetWaitingOnUploads'});
        state = SyncActions.preSync(state);
        expect(state.resetWaitingWarning).toBe(false);
    });
});
