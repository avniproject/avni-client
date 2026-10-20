jest.mock('../../src/framework/bean/Service', () => () => (target) => target);
jest.mock('react-native-libsodium', () => require('libsodium-wrappers'));
jest.mock('react-native-tcp-socket', () => require('net'));
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));

import {AppState} from 'react-native';
import ClinicSpokeService from '../../src/service/clinicsharing/ClinicSpokeService';
import {CLINIC_SYNC_INTERVAL_SECONDS} from '../../src/framework/clinicsharing/ClinicSharingConstants';

describe('Syncing with the hub while joined', () => {
    let spoke, finishSync, appStateHandler;
    const joinInfo = {host: '10.0.0.1', port: 7373, key: 'k', hubId: 'h', epoch: 'e'};
    const interval = CLINIC_SYNC_INTERVAL_SECONDS * 1000;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
            appStateHandler = handler;
            return {remove: jest.fn()};
        });
        spoke = new ClinicSpokeService({}, {});
        spoke.getService = () => undefined;
        spoke.syncWithHub = jest.fn(() => new Promise((resolve) => { finishSync = resolve; }));
    });

    afterEach(() => {
        spoke.leave();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    const settle = async () => {
        finishSync({});
        for (let tick = 0; tick < 6; tick++) await Promise.resolve();
    };

    it('syncs as soon as it joins, then every 30 seconds', async () => {
        spoke.join(joinInfo);
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(1);
        expect(spoke.syncWithHub).toHaveBeenCalledWith(joinInfo, undefined);
        await settle();

        jest.advanceTimersByTime(interval);
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(2);
        await settle();
        jest.advanceTimersByTime(interval);
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(3);
    });

    it('keeps one sync in flight at a time', async () => {
        spoke.join(joinInfo);
        jest.advanceTimersByTime(interval * 3);
        spoke.syncNow();

        expect(spoke.syncWithHub).toHaveBeenCalledTimes(1);
        await settle();
        spoke.syncNow();
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(2);
    });

    it('stops while the app is in the background and syncs again when it comes back', async () => {
        spoke.join(joinInfo);
        await settle();

        appStateHandler('background');
        jest.advanceTimersByTime(interval * 4);
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(1);

        appStateHandler('active');
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(2);
    });

    it("skips the regular hub sync while a server sync runs, and sends once to the hub before the server upload", async () => {
        const syncService = {serverSyncRunning: false};
        spoke.getService = (name) => (name === 'syncService' ? syncService : undefined);
        spoke.join(joinInfo);
        await settle();
        syncService.serverSyncRunning = true;

        jest.advanceTimersByTime(interval);
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(1);

        const beforeUpload = spoke.syncBeforeServerUpload();
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(2);
        await settle();
        await beforeUpload;
    });

    it("waits for a hub sync already under way before the server upload starts", async () => {
        spoke.join(joinInfo);
        let finished = false;
        const beforeUpload = spoke.syncBeforeServerUpload().then(() => { finished = true; });
        await Promise.resolve();
        expect(finished).toBe(false);

        await settle();
        await settle();
        await beforeUpload;
        expect(finished).toBe(true);
    });

    it('stops when the phone leaves the hub', async () => {
        spoke.join(joinInfo);
        await settle();
        spoke.leave();

        jest.advanceTimersByTime(interval * 4);
        expect(spoke.syncWithHub).toHaveBeenCalledTimes(1);
        expect(await spoke.syncNow()).toBeNull();
    });
});
