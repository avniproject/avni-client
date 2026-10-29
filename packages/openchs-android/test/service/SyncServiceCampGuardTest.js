/**
 * A phone in a clinic sharing camp shares only through its hub, so SyncService.sync refuses to
 * run at all until it leaves the camp, whichever screen or job asked.
 *
 * Run: npx jest --selectProjects unit --testPathPattern SyncServiceCampGuardTest
 */
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
import {IgnorableSyncError} from 'openchs-models';
import SyncService from '../../src/service/SyncService';
import LastSyncCompleted from '../../src/service/LastSyncCompleted';

const LOCK = 'lock-camp';

function buildSyncService(isInCamp) {
    const svc = Object.create(SyncService.prototype);
    svc.syncLock = LOCK;
    svc.db = {isSqlite: false};
    svc.mediaQueueService = {isMediaUploadRequired: () => false};
    svc.entityQueueService = {getPresentEntities: () => []};
    svc.metricsService = {getAppInfo: async () => ({})};
    svc.dispatchAction = jest.fn();
    svc.getService = jest.fn((name) => {
        if (name === 'clinicSpokeService') return {isInCamp};
        if (name === 'syncTelemetryService') return {getLatestCompletedFullSync: () => ({syncEndTime: moment().subtract(1, 'hours').toDate()})};
        return undefined;
    });
    svc.dataServerSync = jest.fn(async () => {});
    svc.telemetrySync = jest.fn(async () => {});
    svc.logSyncCompleteEvent = jest.fn();
    svc.clearDataIn = jest.fn();
    svc.downloadNewsImages = jest.fn(async () => {});
    return svc;
}

const runSync = (svc) => svc.sync(LOCK, [], () => {}, () => {}, {}, Date.now(), SyncService.syncSources.SYNC_BUTTON, null);

describe('SyncService.sync during a clinic sharing camp', () => {
    beforeEach(async () => await AsyncStorage.clear());

    it('refuses before touching anything: no upload, no download, and the last-sync marker left as it was', async () => {
        await LastSyncCompleted.set();
        const svc = buildSyncService(async () => true);

        const error = await runSync(svc).catch((e) => e);

        expect(error).toBeInstanceOf(IgnorableSyncError);
        expect(svc.dataServerSync).not.toHaveBeenCalled();
        expect(svc.dispatchAction).not.toHaveBeenCalled();
        expect(await LastSyncCompleted.didComplete()).toBe(true);
    });

    it('syncs as usual outside a camp', async () => {
        const svc = buildSyncService(async () => false);

        await runSync(svc);

        expect(svc.dataServerSync).toHaveBeenCalled();
    });

    it('still syncs when the camp flag cannot be read, so a broken clinic file never stops every sync', async () => {
        const svc = buildSyncService(async () => { throw new Error('disk error'); });

        await runSync(svc);

        expect(svc.dataServerSync).toHaveBeenCalled();
    });
});
