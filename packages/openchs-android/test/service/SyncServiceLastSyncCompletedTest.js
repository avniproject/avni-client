/**
 * #2141 — the "last sync finished" marker that the catchment upload reads.
 *
 * Drives SyncService.sync itself with the server work stubbed out, so moving the point where
 * the marker is lowered or raised shows up here. The test this replaces restated those two
 * steps inside itself, and so could not see an upload-only background run lower the marker
 * and never raise it again.
 *
 * Run: npx jest test/service/SyncServiceLastSyncCompletedTest.js --selectProjects unit --verbose
 */

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
    default: {logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn()},
}));
jest.mock('../../src/task/PruneMedia', () => ({pruneConceptMedia: jest.fn(async () => {})}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import SyncService from '../../src/service/SyncService';
import LastSyncCompleted from '../../src/service/LastSyncCompleted';

const {SYNC_BUTTON, ONLY_UPLOAD_BACKGROUND_JOB} = SyncService.syncSources;
const LOCK = 'lock-2141';

/**
 * A SyncService whose server work is stubbed. The background job asks for an upload-only run
 * and is promoted to a full sync once the last full sync is over twelve hours old, so
 * `lastFullSyncHoursAgo` decides which of the two a background request becomes.
 * `markerDuringSync` is what the upload guard would have read while the sync was running.
 */
function buildSyncService({lastFullSyncHoursAgo = 1, serverSyncFails = false} = {}) {
    const svc = Object.create(SyncService.prototype);
    svc.syncLock = LOCK;
    svc.mediaQueueService = {isMediaUploadRequired: () => false};
    svc.entityQueueService = {getPresentEntities: () => []};
    svc.metricsService = {getAppInfo: async () => ({})};
    svc.dispatchAction = jest.fn();
    svc.getService = jest.fn((name) => name === 'syncTelemetryService'
        ? {getLatestCompletedFullSync: () => ({syncEndTime: moment().subtract(lastFullSyncHoursAgo, 'hours').toDate()})}
        : undefined);
    svc.dataServerSync = jest.fn(async () => {
        svc.markerDuringSync = await LastSyncCompleted.didComplete();
        if (serverSyncFails) throw new Error('syncTimeoutError');
    });
    svc.telemetrySync = jest.fn(async () => {});
    svc.logSyncCompleteEvent = jest.fn();
    svc.clearDataIn = jest.fn();
    svc.downloadNewsImages = jest.fn(async () => {});
    return svc;
}

const runSync = (svc, syncSource) => svc.sync(LOCK, [], () => {}, () => {}, {}, Date.now(), syncSource, null);

describe('SyncService.sync and the last-sync-finished marker', () => {
    beforeEach(async () => await AsyncStorage.clear());

    describe('a sync that pulls', () => {
        it('lowers the marker while it runs and raises it when it finishes', async () => {
            await LastSyncCompleted.set();
            const svc = buildSyncService();

            await runSync(svc, SYNC_BUTTON);

            expect(svc.markerDuringSync).toBe(false);
            expect(await LastSyncCompleted.didComplete()).toBe(true);
        });

        it('leaves the marker down when it fails, though the sync before it finished', async () => {
            await LastSyncCompleted.set();
            const svc = buildSyncService({serverSyncFails: true});

            await expect(runSync(svc, SYNC_BUTTON)).rejects.toThrow('syncTimeoutError');

            expect(await LastSyncCompleted.didComplete()).toBe(false);
        });

        // The marker follows the run the request was promoted to, not the request.
        it('includes a background request promoted to a full sync', async () => {
            await LastSyncCompleted.set();
            const svc = buildSyncService({lastFullSyncHoursAgo: 13, serverSyncFails: true});

            await expect(runSync(svc, ONLY_UPLOAD_BACKGROUND_JOB)).rejects.toThrow('syncTimeoutError');

            expect(svc.markerDuringSync).toBe(false);
            expect(await LastSyncCompleted.didComplete()).toBe(false);
        });
    });

    // An upload-only run pulls nothing, so it can make the database neither current nor stale.
    // Most background runs are this kind: one an hour for the twelve hours after a full sync.
    describe('an upload-only background run', () => {
        it('leaves a raised marker raised', async () => {
            await LastSyncCompleted.set();
            const svc = buildSyncService();

            await runSync(svc, ONLY_UPLOAD_BACKGROUND_JOB);

            expect(svc.markerDuringSync).toBe(true);
            expect(await LastSyncCompleted.didComplete()).toBe(true);
        });

        // Whatever it failed to send is still queued, and the unsaved-data check blocks on that.
        it('leaves a raised marker raised when it fails', async () => {
            await LastSyncCompleted.set();
            const svc = buildSyncService({serverSyncFails: true});

            await expect(runSync(svc, ONLY_UPLOAD_BACKGROUND_JOB)).rejects.toThrow('syncTimeoutError');

            expect(await LastSyncCompleted.didComplete()).toBe(true);
        });

        it('never raises a marker that is down', async () => {
            const svc = buildSyncService();

            await runSync(svc, ONLY_UPLOAD_BACKGROUND_JOB);

            expect(await LastSyncCompleted.didComplete()).toBe(false);
        });
    });
});
