/**
 * ABDM M1: audit records of ABHA actions that have not reached the server are sent again whenever the app syncs.
 *
 * Drives SyncService.sync itself with the server work stubbed out, as SyncServiceLastSyncCompletedTest does.
 *
 * Run: npx jest test/service/SyncServiceAbhaEventsTest.js --selectProjects unit --verbose
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
import * as Keychain from 'react-native-keychain';
import SyncService from '../../src/service/SyncService';
import OrganisationConfigService from '../../src/service/OrganisationConfigService';
import AbhaService from '../../src/service/AbhaService';

const {SYNC_BUTTON, ONLY_UPLOAD_BACKGROUND_JOB} = SyncService.syncSources;
const LOCK = 'lock-abha';

function buildSyncService({abhaOn = true, resend = async () => {}} = {}) {
    const svc = Object.create(SyncService.prototype);
    svc.syncLock = LOCK;
    svc.mediaQueueService = {isMediaUploadRequired: () => false};
    svc.entityQueueService = {getPresentEntities: () => []};
    svc.metricsService = {getAppInfo: async () => ({})};
    svc.dispatchAction = jest.fn();
    svc.abhaService = {resendUnsentEvents: jest.fn(resend)};
    const services = new Map([
        [OrganisationConfigService, {isAbhaEnabled: () => abhaOn}],
        [AbhaService, svc.abhaService],
        ['syncTelemetryService', {getLatestCompletedFullSync: () => ({syncEndTime: new Date()})}],
    ]);
    svc.getService = jest.fn((type) => services.get(type));
    svc.dataServerSync = jest.fn(async () => {});
    svc.telemetrySync = jest.fn(async () => {});
    svc.logSyncCompleteEvent = jest.fn();
    svc.clearDataIn = jest.fn();
    svc.downloadNewsImages = jest.fn(async () => {});
    return svc;
}

const runSync = (svc, syncSource) => svc.sync(LOCK, [], () => {}, () => {}, {}, Date.now(), syncSource, null);
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('SyncService.sync and unsent ABHA audit records', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        Keychain.resetGenericPassword.mockClear();
        AbhaService.unsentEventsMayBeKept();
    });

    it('sends them again on every sync, the hourly upload-only one included', async () => {
        const svc = buildSyncService();
        await runSync(svc, SYNC_BUTTON);
        await runSync(svc, ONLY_UPLOAD_BACKGROUND_JOB);
        await flush();
        expect(svc.abhaService.resendUnsentEvents).toHaveBeenCalledTimes(2);
    });

    it('does not hold up the end of the sync while they are on their way', async () => {
        const svc = buildSyncService({resend: () => new Promise(() => {})});
        await runSync(svc, SYNC_BUTTON);
        expect(svc.abhaService.resendUnsentEvents).toHaveBeenCalledTimes(1);
    });

    it('a failure to send them never fails the sync', async () => {
        const svc = buildSyncService({resend: () => { throw new Error('storage unreadable'); }});
        await expect(runSync(svc, SYNC_BUTTON)).resolves.toBe(SYNC_BUTTON);
    });

    // An organisation with ABHA off pays for one clear an app run, not one on every sync.
    it('sends none of them when the organisation has ABHA off, and clears them instead, once an app run', async () => {
        const svc = buildSyncService({abhaOn: false});
        await runSync(svc, SYNC_BUTTON);
        await runSync(svc, ONLY_UPLOAD_BACKGROUND_JOB);
        await flush();
        expect(svc.abhaService.resendUnsentEvents).not.toHaveBeenCalled();
        expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(1);
    });

    it('clears them again on a sync with ABHA off after one with ABHA on, which may have kept some', async () => {
        await runSync(buildSyncService({abhaOn: false}), SYNC_BUTTON);
        await flush();
        await runSync(buildSyncService({abhaOn: true}), SYNC_BUTTON);
        await flush();
        await runSync(buildSyncService({abhaOn: false}), SYNC_BUTTON);
        await flush();
        expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(2);
    });

    it('tries the clear again on the next sync when it failed', async () => {
        Keychain.resetGenericPassword.mockImplementationOnce(async () => { throw new Error('keystore locked'); });
        await runSync(buildSyncService({abhaOn: false}), SYNC_BUTTON);
        await flush();
        await runSync(buildSyncService({abhaOn: false}), SYNC_BUTTON);
        await flush();
        expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(2);
    });

    it('keeps them while the organisation has ABHA on', async () => {
        const clear = jest.spyOn(AbhaService, 'clearUnsentEvents').mockResolvedValue(undefined);
        await runSync(buildSyncService(), SYNC_BUTTON);
        await flush();
        expect(clear).not.toHaveBeenCalled();
        clear.mockRestore();
    });
});
