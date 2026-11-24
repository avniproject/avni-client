// SyncService reaches a long tail of native modules at import time; none are exercised here.
jest.mock("react-native-randombytes", () => ({randomBytes: () => []}));
jest.mock("react-native-zip-archive", () => ({zip: jest.fn(), unzip: jest.fn()}));
jest.mock("react-native-fs", () => ({DocumentDirectoryPath: "/mock"}));

import SyncService from "../../src/service/SyncService";
import SyncPhaseTimer, {SyncPhases} from "../../src/utility/SyncPhaseTimer";

const clockOf = (...times) => {
    const queue = [...times];
    return () => queue.shift();
};

const entityStatus = {
    push: [{entity: 'Individual', todo: 10, done: 10}, {entity: 'Encounter', todo: 30, done: 25}],
    pull: [{entity: 'Individual', todo: 200, done: 120}, {entity: 'Encounter', todo: 0, done: 0}]
};

const serviceWith = (timer, status = entityStatus) => {
    const svc = Object.create(SyncService.prototype);
    svc._syncPhaseTimer = timer;
    svc.reduxStore = {getState: () => ({syncTelemetryActions: {entityStatus: status}})};
    return svc;
};

describe("SyncService sync failure params (PE-219)", () => {
    it("names the phase it stopped in and how far push and pull got", () => {
        const timer = new SyncPhaseTimer(clockOf(0, 4000, 4100));
        timer.start(SyncPhases.PUSH);
        timer.end(SyncPhases.PUSH);
        timer.start(SyncPhases.PULL);

        expect(serviceWith(timer).syncFailureParams()).toEqual({
            push_duration_ms: 4000,
            failed_phase: 'pull',
            push_done: 35, push_todo: 40,
            pull_done: 120, pull_todo: 200
        });
    });

    it("sends no progress for a phase that never started", () => {
        const timer = new SyncPhaseTimer(clockOf(0));
        timer.start(SyncPhases.MEDIA);

        const params = serviceWith(timer).syncFailureParams();
        expect(params.failed_phase).toBe('media');
        expect(params).not.toHaveProperty('push_done');
        expect(params).not.toHaveProperty('pull_done');
    });

    it("still names the phase when the telemetry state is unavailable", () => {
        const timer = new SyncPhaseTimer(clockOf(0));
        timer.start(SyncPhases.PUSH);
        expect(serviceWith(timer, null).syncFailureParams()).toEqual({failed_phase: 'push'});
    });

    describe("speed", () => {
        const withTraffic = (svc) => {
            svc.transferStats.download.add({bytes: 1000000, transferMs: 4000});
            svc.transferStats.upload.add({bytes: 50000, transferMs: 2000});
            svc.mediaQueueService = {getUploadStats: () => ({bytes: 3000000, transferMs: 12000})};
            return svc;
        };

        it("adds the speed of every step that finished to sync_failed", () => {
            const timer = new SyncPhaseTimer(clockOf(0, 1, 2, 3, 4, 5));
            [SyncPhases.MEDIA, SyncPhases.PUSH, SyncPhases.PULL].forEach(phase => {
                timer.start(phase);
                timer.end(phase);
            });
            const svc = withTraffic(serviceWith(timer));

            expect(svc.syncFailureParams())
                .toMatchObject({download_throughput_kbps: 2000, upload_throughput_kbps: 200, media_upload_kbps: 2000});
        });

        it("leaves out the speed of the step the sync failed in", () => {
            const timer = new SyncPhaseTimer(clockOf(0, 1, 2, 3, 4));
            timer.start(SyncPhases.MEDIA);
            timer.end(SyncPhases.MEDIA);
            timer.start(SyncPhases.PUSH);
            timer.end(SyncPhases.PUSH);
            timer.start(SyncPhases.PULL);
            const svc = withTraffic(serviceWith(timer));

            expect(Object.keys(svc.syncBandwidth())).toEqual(['uploadThroughput', 'mediaUpload']);
        });

        it("ignores media stats left from an earlier sync when this one uploaded no media", () => {
            const timer = new SyncPhaseTimer(clockOf(0, 1));
            timer.start(SyncPhases.PUSH);
            timer.end(SyncPhases.PUSH);
            const svc = withTraffic(serviceWith(timer));

            expect(svc.syncBandwidth()).not.toHaveProperty('mediaUpload');
        });

        it("reports no speeds when the sync failed in setup", () => {
            const svc = withTraffic(serviceWith(new SyncPhaseTimer()));

            expect(svc.syncBandwidth()).toEqual({});
            expect(svc.syncFailureParams()).toEqual({failed_phase: 'setup'});
        });
    });

    describe("resetSyncMeasurements", () => {
        it("drops the previous sync's phases and speeds, so an early failure reports setup only", () => {
            const timer = new SyncPhaseTimer(clockOf(0, 1, 2, 3));
            timer.start(SyncPhases.PUSH);
            timer.end(SyncPhases.PUSH);
            timer.start(SyncPhases.PULL);
            timer.end(SyncPhases.PULL);
            const svc = serviceWith(timer, entityStatus);
            svc.transferStats.download.add({bytes: 1000000, transferMs: 4000});
            expect(svc.syncFailureParams()).toMatchObject({failed_phase: 'finalise', download_throughput_kbps: 2000});

            svc.resetSyncMeasurements();

            expect(svc.syncFailureParams()).toEqual({failed_phase: 'setup'});
        });
    });
});
