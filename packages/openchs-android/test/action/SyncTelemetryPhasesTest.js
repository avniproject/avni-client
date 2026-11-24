import {expect} from 'chai';
import {SyncTelemetryActions} from '../../src/action/SyncTelemetryActions';
import EntityService from '../../src/service/EntityService';

const stubContext = () => ({
    get: (service) => (service === EntityService
        ? {saveAndPushToEntityQueue: () => {}, getCount: () => 0, getAll: () => []}
        : {})
});

const inFlight = () => {
    const state = SyncTelemetryActions.getInitialState();
    state.syncTelemetry.appInfo = '{}';
    state.syncStarted = true;
    return state;
};

const phases = {
    media: {startedAt: '2026-10-28T10:00:00.000Z', endedAt: '2026-10-28T10:00:02.000Z', durationMs: 2000},
    push: {startedAt: '2026-10-28T10:00:02.000Z', endedAt: '2026-10-28T10:00:06.500Z', durationMs: 4500},
    pull: {startedAt: '2026-10-28T10:00:06.600Z', endedAt: '2026-10-28T10:00:18.600Z', durationMs: 12000}
};

describe('SyncTelemetryActions sync phases (PE-217)', () => {
    it('writes the phases into entityStatus of a completed row', () => {
        const newState = SyncTelemetryActions.syncCompleted(inFlight(), {phases}, stubContext());
        expect(newState.syncTelemetry.getEntityStatus().syncPhases).to.deep.equal(phases);
    });

    it('writes the phases a failed sync reached, the open one with a start only', () => {
        const reached = {...phases, pull: {startedAt: '2026-10-28T10:00:06.600Z'}};
        const newState = SyncTelemetryActions.syncFailed(inFlight(), {phases: reached}, stubContext());
        expect(newState.syncTelemetry.getEntityStatus().syncPhases).to.deep.equal(reached);
    });

    it('writes no syncPhases key when none were sent', () => {
        const completed = SyncTelemetryActions.syncCompleted(inFlight(), undefined, stubContext());
        expect(completed.syncTelemetry.getEntityStatus()).to.not.have.property('syncPhases');

        const failed = SyncTelemetryActions.syncFailed(inFlight(), {phases: {}}, stubContext());
        expect(failed.syncTelemetry.getEntityStatus()).to.not.have.property('syncPhases');
    });

    it('records where a failed sync stopped', () => {
        const newState = SyncTelemetryActions.syncFailed(inFlight(), {phases, failedPhase: 'pull'}, stubContext());
        expect(newState.syncTelemetry.getEntityStatus().failedPhase).to.equal('pull');
    });

    it('writes no failedPhase on a completed row, or when none was sent', () => {
        const completed = SyncTelemetryActions.syncCompleted(inFlight(), {phases, failedPhase: 'pull'}, stubContext());
        expect(completed.syncTelemetry.getEntityStatus()).to.not.have.property('failedPhase');

        const failed = SyncTelemetryActions.syncFailed(inFlight(), {phases}, stubContext());
        expect(failed.syncTelemetry.getEntityStatus()).to.not.have.property('failedPhase');
    });

    it('writes the speeds on completed and failed rows', () => {
        const bandwidth = {downloadThroughput: {bytes: 1000000, transferMs: 4000, kbps: 2000}};
        const completed = SyncTelemetryActions.syncCompleted(inFlight(), {phases, bandwidth}, stubContext());
        expect(completed.syncTelemetry.getEntityStatus().bandwidth).to.deep.equal(bandwidth);

        const failed = SyncTelemetryActions.syncFailed(inFlight(), {phases, bandwidth}, stubContext());
        expect(failed.syncTelemetry.getEntityStatus().bandwidth).to.deep.equal(bandwidth);
    });

    it('writes no bandwidth key when there was no traffic', () => {
        const completed = SyncTelemetryActions.syncCompleted(inFlight(), {phases, bandwidth: {}}, stubContext());
        expect(completed.syncTelemetry.getEntityStatus()).to.not.have.property('bandwidth');
    });
});
