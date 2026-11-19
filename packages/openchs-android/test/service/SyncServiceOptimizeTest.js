// A sync can change table sizes by orders of magnitude, so table statistics are refreshed after each one.
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

const LOCK = 'lock-2215';

function buildSyncService(db, {serverSyncFails = false} = {}) {
    const svc = Object.create(SyncService.prototype);
    svc.syncLock = LOCK;
    svc.db = db;
    svc.mediaQueueService = {isMediaUploadRequired: () => false};
    svc.entityQueueService = {getPresentEntities: () => []};
    svc.metricsService = {getAppInfo: async () => ({})};
    svc.dispatchAction = jest.fn();
    svc.getService = jest.fn((name) => name === 'syncTelemetryService'
        ? {getLatestCompletedFullSync: () => ({syncEndTime: moment().subtract(1, 'hours').toDate()})}
        : undefined);
    svc.dataServerSync = jest.fn(async () => {
        if (serverSyncFails) throw new Error('syncTimeoutError');
    });
    svc.telemetrySync = jest.fn(async () => {});
    svc.logSyncCompleteEvent = jest.fn();
    svc.clearDataIn = jest.fn();
    svc.downloadNewsImages = jest.fn(async () => {});
    return svc;
}

const runSync = (svc) => svc.sync(LOCK, [], () => {}, () => {}, {}, Date.now(), SyncService.syncSources.SYNC_BUTTON, null);

describe('SyncService.sync and table statistics', () => {
    beforeEach(async () => await AsyncStorage.clear());

    it('refreshes statistics once a sync on the new database finishes', async () => {
        const db = {isSqlite: true, optimize: jest.fn()};
        await runSync(buildSyncService(db));
        expect(db.optimize).toHaveBeenCalledTimes(1);
    });

    it('does not refresh statistics when the sync fails', async () => {
        const db = {isSqlite: true, optimize: jest.fn()};
        await expect(runSync(buildSyncService(db, {serverSyncFails: true}))).rejects.toThrow('syncTimeoutError');
        expect(db.optimize).not.toHaveBeenCalled();
    });

    it('leaves the old database alone', async () => {
        const db = {isSqlite: false};
        await expect(runSync(buildSyncService(db))).resolves.toBeDefined();
    });
});
