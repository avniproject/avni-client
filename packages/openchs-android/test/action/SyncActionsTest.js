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
