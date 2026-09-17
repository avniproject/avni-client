import {expect} from 'chai';
import {SyncTelemetryActions} from '../../src/action/SyncTelemetryActions';
import EntityService from '../../src/service/EntityService';

const stubContext = () => {
    const saved = [];
    return {
        saved,
        get: (service) => (service === EntityService
            ? {saveAndPushToEntityQueue: (entity) => saved.push(entity)}
            : {})
    };
};

// A sync in flight: START_SYNC has run and nothing has ended it yet.
const stateWithAppInfo = (appInfo) => {
    const state = SyncTelemetryActions.getInitialState();
    state.syncTelemetry.appInfo = appInfo;
    state.syncStarted = true;
    return state;
};

describe('SyncTelemetryActions.syncFailed', () => {
    it('marks the row failed, so it is distinguishable from an abandoned sync', () => {
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {}, stubContext());
        expect(newState.syncTelemetry.syncStatus).to.equal('failed');
    });

    it('sets an end time, so the row is not left open forever', () => {
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {}, stubContext());
        expect(newState.syncTelemetry.syncEndTime).to.be.a('date');
    });

    it('leaves appInfo exactly as the sync recorded it', () => {
        const appInfo = '{"dbSize":42,"observationCount":7}';
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo(appInfo), {}, stubContext());
        expect(newState.syncTelemetry.appInfo).to.equal(appInfo);
    });

    describe('when no sync is actually in flight', () => {
        // The redux slice keeps the previous sync's telemetry between syncs and clone() keeps
        // its uuid, so acting on it would overwrite a finished row by primary key. This is
        // reachable: SyncComponent.startSync's offline branch calls _onError with no sync
        // ever started, and SyncService.sync can reject before it dispatches START_SYNC.
        const completedState = () => {
            const state = stateWithAppInfo('{"dbSize":42}');
            state.syncTelemetry.syncStatus = 'complete';
            state.syncTelemetry.syncEndTime = new Date('2026-09-01T10:00:00Z');
            state.syncStarted = false;
            return state;
        };

        it('does not flip a completed sync to failed', () => {
            const newState = SyncTelemetryActions.syncFailed(completedState(), {}, stubContext());
            expect(newState.syncTelemetry.syncStatus).to.equal('complete');
        });

        it('does not re-save the completed row, so the server gets no second copy of that uuid', () => {
            const context = stubContext();
            SyncTelemetryActions.syncFailed(completedState(), {}, context);
            expect(context.saved.length).to.equal(0);
        });

        it('does not overwrite a row already recorded as failed', () => {
            const failed = SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {}, stubContext());
            const context = stubContext();
            SyncTelemetryActions.syncFailed(failed, {}, context);
            expect(context.saved.length).to.equal(0);
        });

        it('does not save a fresh row that no sync ever used, as at app start', () => {
            // A fresh row is also "incomplete". Saving it sent the server a failed sync with
            // empty device and app info for every Sync tap while offline. BUG-2097-01
            const context = stubContext();
            const newState = SyncTelemetryActions.syncFailed(SyncTelemetryActions.getInitialState(), {}, context);
            expect(context.saved.length).to.equal(0);
            expect(newState.syncTelemetry.syncStatus).to.equal('incomplete');
        });

        it('does not save anything when the sync before it completed', () => {
            const completed = SyncTelemetryActions.syncCompleted(stateWithAppInfo('{}'), {}, {
                get: () => ({saveAndPushToEntityQueue: () => {}, getCount: () => 0, getAll: () => []})
            });
            const context = stubContext();
            SyncTelemetryActions.syncFailed(completed, {}, context);
            expect(context.saved.length).to.equal(0);
        });
    });

    it('saves the row to the entity queue so it reaches the server on the next successful sync', () => {
        const context = stubContext();
        SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {}, context);
        expect(context.saved.length).to.equal(1);
        expect(context.saved[0].syncStatus).to.equal('failed');
    });
});
