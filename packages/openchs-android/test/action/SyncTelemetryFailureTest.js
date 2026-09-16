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

const stateWithAppInfo = (appInfo) => {
    const state = SyncTelemetryActions.getInitialState();
    state.syncTelemetry.appInfo = appInfo;
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
            const state = stateWithAppInfo('{}');
            state.syncTelemetry.syncStatus = 'failed';
            const context = stubContext();
            SyncTelemetryActions.syncFailed(state, {}, context);
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
