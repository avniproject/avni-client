// Native leaf modules pulled in transitively by SyncService's import tree.
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({
    zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()})),
}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false),
    setGenericPassword: jest.fn(async () => {}),
    resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {
        logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(), elapsedMs: jest.fn(() => 0)
    },
}));
const mockLogEvent = jest.fn();
jest.mock('../../src/utility/Analytics', () => ({
    logEvent: (...args) => mockLogEvent(...args),
    firebaseEvents: {SYNC_START: 'sync_start', SYNC_COMPLETE: 'sync_complete', SYNC_FAILED: 'sync_failed'}
}));
jest.mock('../../src/task/PruneMedia', () => ({pruneConceptMedia: jest.fn(async () => {})}));

import SyncService from '../../src/service/SyncService';
import SyncPhaseTimer, {SyncPhases} from '../../src/utility/SyncPhaseTimer';

const LOCK = 'lock-measure';

const afterAFullSync = (svc) => {
    let t = 0;
    const timer = new SyncPhaseTimer(() => t++);
    [SyncPhases.MEDIA, SyncPhases.PUSH, SyncPhases.PULL].forEach(phase => { timer.start(phase); timer.end(phase); });
    svc._syncPhaseTimer = timer;
    svc.transferStats.download.add({bytes: 1000000, transferMs: 4000});
    svc.transferStats.upload.add({bytes: 50000, transferMs: 2000});
    return svc;
};

describe('SyncService measurement wiring', () => {
    beforeEach(() => mockLogEvent.mockClear());

    it('reports only setup when sync() fails before START_SYNC, nothing from the previous sync', async () => {
        const svc = afterAFullSync(Object.create(SyncService.prototype));
        svc.syncLock = LOCK;
        svc.mediaQueueService = {
            isMediaUploadRequired: () => false,
            getUploadStats: () => ({bytes: 3000000, transferMs: 12000})
        };
        svc.entityQueueService = {getPresentEntities: () => []};
        svc.metricsService = {getAppInfo: async () => { throw new Error('app info failed'); }};
        svc.dispatchAction = jest.fn();
        expect(svc.syncFailureParams().failed_phase).toBe('finalise');

        await expect(svc.sync(LOCK, [], () => {}, () => {}, {}, Date.now(), SyncService.syncSources.SYNC_BUTTON, null))
            .rejects.toThrow('app info failed');

        expect(svc.syncFailureParams()).toEqual({failed_phase: 'setup'});
        expect(svc.dispatchAction).not.toHaveBeenCalled();
    });

    describe('dataServerSync', () => {
        // t is advanced by each stub, so every duration below is exact.
        const build = () => {
            const clock = {t: 0};
            const svc = Object.create(SyncService.prototype);
            svc._syncPhaseTimer = new SyncPhaseTimer(() => clock.t);
            const resolved = () => Promise.resolve();
            svc.pushData = jest.fn(async () => { clock.t += 2000; });
            svc.getResetSyncData = jest.fn(resolved);
            svc.getSyncDetails = jest.fn(async () => ({syncDetails: [], endDateTime: 'end', now: 'now'}));
            svc.getRefData = jest.fn(resolved);
            svc.getTxData = jest.fn(async () => { clock.t += 1000; });
            svc._switchBackendAndResyncRefDataIfNeeded = jest.fn(async () => null);
            svc.entitySyncStatusService = {updateAsPerSyncDetails: jest.fn()};
            svc.updateAsPerNewPrivilege = jest.fn(() => []);
            ['_disableForeignKeysIfSqlite', '_enableForeignKeysIfSqlite', '_enableShallowHydrationIfSqlite',
                '_disableShallowHydrationIfSqlite', '_checkForeignKeyIntegrityIfSqlite'].forEach(m => {
                svc[m] = () => {};
            });
            svc._buildReferenceCacheIfSqlite = jest.fn(resolved);
            ['downloadNewsImages', 'downloadExtensions', 'downloadCustomCardHtmlFiles', 'downloadFormShareTemplates',
                'downloadContent'].forEach(m => { svc[m] = jest.fn(resolved); });
            svc.downloadIcons = jest.fn(async () => { clock.t += 7000; });
            svc.getService = jest.fn(() => ({
                isResetSyncRequired: () => true,
                resetSync: () => { clock.t += 5000; },
                encryptOrDecryptDbIfRequired: resolved,
                migrateSubjects: resolved,
            }));
            return {svc, clock};
        };

        it('leaves the reset-sync dialog and the reset wipe out of the pull duration', async () => {
            const {svc, clock} = build();
            const userConfirmation = async () => { clock.t += 60000; return 'YES'; };
            const noop = () => {};

            await svc.dataServerSync([], noop, noop, noop, noop, true, userConfirmation, false);

            const phases = svc.syncPhaseTimer.toTelemetry();
            expect(phases.push.durationMs).toBe(2000);
            expect(phases.pull.pausedMs).toBe(65000);
            // Three tx pulls of 1 s each; the 7 s icon download after the pull is not counted.
            expect(phases.pull.durationMs).toBe(3000);
        });
    });

    it('leaves the migration catch-up wait out of the pull duration', async () => {
        const clock = {t: 0};
        const svc = Object.create(SyncService.prototype);
        svc._syncPhaseTimer = new SyncPhaseTimer(() => clock.t);
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
            clock.t += ms;
            fn();
        });
        svc.syncPhaseTimer.start(SyncPhases.PULL);
        svc.getSyncDetails = jest.fn(async () => ({syncDetails: [], endDateTime: '2026-10-30T10:00:00.000Z'}));
        svc.entitySyncStatusService = {updateAsPerSyncDetails: jest.fn(), removeRevokedPrivileges: jest.fn(() => [])};
        svc.getTxData = jest.fn(async () => {});

        await svc._catchUpTxDataAfterMigration([], '2026-10-30T10:00:00.001Z');
        clock.t += 300;
        svc.syncPhaseTimer.end(SyncPhases.PULL);
        setTimeoutSpy.mockRestore();

        const pull = svc.syncPhaseTimer.toTelemetry().pull;
        expect(pull.pausedMs).toBe(1001);
        expect(pull.durationMs).toBe(300);
    });

    it('adds each pulled page and each pushed record to the speed totals', async () => {
        const svc = Object.create(SyncService.prototype);
        svc.dispatchAction = jest.fn();
        await svc.persistAll({entityName: 'Individual', syncStatus: {}}, [], {bytes: 200000, transferMs: 1000});

        svc.entityQueueService = {
            getAllQueuedItems: (metaData) => ({metaData, entities: [{resource: {uuid: 'u-1'}}]}),
            popItem: () => () => {}
        };
        svc.conventionalRestClient = {
            postAllEntities: async (entitiesToPost, onCompleteOfIndividualPost) =>
                onCompleteOfIndividualPost(entitiesToPost[0].metaData, 'u-1')({bytes: 20000, transferMs: 100})
        };
        await svc.pushData([{entityName: 'Individual'}], () => {});

        expect(svc.transferStats.download).toEqual({bytes: 200000, transferMs: 1000});
        expect(svc.transferStats.upload).toEqual({bytes: 20000, transferMs: 100});
    });

    it('keeps speed samples off the per-entity entries of the telemetry row', async () => {
        const svc = Object.create(SyncService.prototype);
        svc.dispatchAction = jest.fn();

        await svc.persistAll({entityName: 'Individual', syncStatus: {}}, [],
            {networkMs: 1200, parseMs: 5, transferMs: 1000, bytes: 200000});

        const [, {durations}] = svc.dispatchAction.mock.calls[0];
        expect(durations).toEqual({networkMs: 1200, parseMs: 5, persistMs: 0});
    });

    it('does not count a pulled page below the sample size towards download speed', async () => {
        const svc = Object.create(SyncService.prototype);
        svc.dispatchAction = jest.fn();

        await svc.persistAll({entityName: 'Individual', syncStatus: {}}, [], {bytes: 400, transferMs: 400});

        expect(svc.transferStats.download).toEqual({bytes: 0, transferMs: 0});
    });

    it('sends step durations and speeds on sync_complete', () => {
        const svc = afterAFullSync(Object.create(SyncService.prototype));
        svc.mediaQueueService = {getUploadStats: () => ({bytes: 3000000, transferMs: 12000})};

        svc.logSyncCompleteEvent(Date.now() - 1000, 'manual');

        const [name, params] = mockLogEvent.mock.calls[0];
        expect(name).toBe('sync_complete');
        expect(params).toMatchObject({
            trigger: 'manual',
            media_duration_ms: 1, push_duration_ms: 1, pull_duration_ms: 1,
            download_throughput_kbps: 2000, upload_throughput_kbps: 200, media_upload_kbps: 2000
        });
    });
});
