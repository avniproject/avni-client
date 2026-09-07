import {expect} from 'chai';
import {SyncTelemetryActions} from '../../src/action/SyncTelemetryActions';
import MediaUploadError from '../../src/framework/errorHandling/MediaUploadError';
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

const mediaError = () => new MediaUploadError({
    fileName: 'abc-123.jpg',
    mediaType: 'Image',
    sizeBytes: 1153024,
    bytesSent: 1048576,
    cause: 'Unable to resolve host "s3.ap-south-1.amazonaws.com"',
    originalError: new Error('original')
});

describe('SyncTelemetryActions.syncFailed', () => {
    it('marks the row failed, so it is distinguishable from an abandoned sync', () => {
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {error: mediaError()}, stubContext());
        expect(newState.syncTelemetry.syncStatus).to.equal('failed');
    });

    it('sets an end time, so the row is not left open forever', () => {
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {error: mediaError()}, stubContext());
        expect(newState.syncTelemetry.syncEndTime).to.be.a('date');
    });

    it('attaches the media failure detail to appInfo', () => {
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {error: mediaError()}, stubContext());
        const syncFailure = JSON.parse(newState.syncTelemetry.appInfo).syncFailure;
        expect(syncFailure.stage).to.equal('mediaUpload');
        expect(syncFailure.fileName).to.equal('abc-123.jpg');
        expect(syncFailure.sizeBytes).to.equal(1153024);
        expect(syncFailure.bytesSent).to.equal(1048576);
        expect(syncFailure.category).to.equal('dnsFailure');
    });

    it('keeps the appInfo the sync already recorded', () => {
        const newState = SyncTelemetryActions.syncFailed(
            stateWithAppInfo('{"dbSize":42,"observationCount":7}'), {error: mediaError()}, stubContext());
        const appInfo = JSON.parse(newState.syncTelemetry.appInfo);
        expect(appInfo.dbSize).to.equal(42);
        expect(appInfo.observationCount).to.equal(7);
    });

    it('records a non-media failure with stage "other" and no media fields', () => {
        const newState = SyncTelemetryActions.syncFailed(
            stateWithAppInfo('{}'), {error: new Error('Connection reset')}, stubContext());
        const syncFailure = JSON.parse(newState.syncTelemetry.appInfo).syncFailure;
        expect(syncFailure.stage).to.equal('other');
        expect(syncFailure.cause).to.equal('Connection reset');
        expect(syncFailure.fileName).to.equal(undefined);
    });

    it('still writes a usable row when dispatched with no error at all', () => {
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {}, stubContext());
        expect(newState.syncTelemetry.syncStatus).to.equal('failed');
        expect(JSON.parse(newState.syncTelemetry.appInfo).syncFailure.stage).to.equal('other');
    });

    it('survives appInfo that is not valid JSON rather than losing the whole row', () => {
        const newState = SyncTelemetryActions.syncFailed(stateWithAppInfo('not json'), {error: mediaError()}, stubContext());
        expect(JSON.parse(newState.syncTelemetry.appInfo).syncFailure.stage).to.equal('mediaUpload');
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
            const newState = SyncTelemetryActions.syncFailed(completedState(), {error: mediaError()}, stubContext());
            expect(newState.syncTelemetry.syncStatus).to.equal('complete');
        });

        it('does not stamp a failure reason onto the completed row', () => {
            const newState = SyncTelemetryActions.syncFailed(completedState(), {error: mediaError()}, stubContext());
            expect(JSON.parse(newState.syncTelemetry.appInfo).syncFailure).to.equal(undefined);
        });

        it('does not re-save the completed row, so the server gets no second copy of that uuid', () => {
            const context = stubContext();
            SyncTelemetryActions.syncFailed(completedState(), {error: mediaError()}, context);
            expect(context.saved.length).to.equal(0);
        });

        it('does not overwrite a row already recorded as failed', () => {
            const state = stateWithAppInfo('{}');
            state.syncTelemetry.syncStatus = 'failed';
            const context = stubContext();
            SyncTelemetryActions.syncFailed(state, {error: mediaError()}, context);
            expect(context.saved.length).to.equal(0);
        });
    });

    it('records a rejection that is a bare string rather than an Error', () => {
        // SyncService.sync rejects with the string "Use acquireLock before calling this function"
        const newState = SyncTelemetryActions.syncFailed(
            stateWithAppInfo('{}'), {error: 'Use acquireLock before calling this function'}, stubContext());
        const syncFailure = JSON.parse(newState.syncTelemetry.appInfo).syncFailure;
        expect(syncFailure.cause).to.equal('Use acquireLock before calling this function');
    });

    it('saves the row to the entity queue so it reaches the server on the next successful sync', () => {
        const context = stubContext();
        SyncTelemetryActions.syncFailed(stateWithAppInfo('{}'), {error: mediaError()}, context);
        expect(context.saved.length).to.equal(1);
        expect(context.saved[0].syncStatus).to.equal('failed');
    });
});
