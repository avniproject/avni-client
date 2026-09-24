// SyncService is imported only for its syncSources constants, but importing it pulls the native
// modules in its dependency graph. Same stubs as SyncServiceClearDataTest.
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import LastSyncCompleted from '../../src/service/LastSyncCompleted';
import SyncService from '../../src/service/SyncService';

// Mirrors what SyncService.sync does at its START_SYNC dispatch and in its syncCompleted chain.
// SyncService.sync itself cannot be driven here — it needs a database and a server — so these
// pin the two decisions the wiring has to honour. The wiring is checked by grep in the plan's
// Step 4, and the source-name assertion below fails if either constant is renamed or removed.
const onSyncStarted = () => LastSyncCompleted.clear();
const onSyncFinished = (syncSource) =>
    syncSource === SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB
        ? Promise.resolve()
        : LastSyncCompleted.set();

describe('the sync lifecycle drives the flag', () => {
    beforeEach(async () => await AsyncStorage.clear());

    it('the constants the guard keys on still exist', () => {
        expect(SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB).toBeDefined();
        expect(SyncService.syncSources.SYNC_BUTTON).toBeDefined();
    });

    it('a manual sync that starts and finishes leaves the flag set', async () => {
        await onSyncStarted();
        await onSyncFinished(SyncService.syncSources.SYNC_BUTTON);
        expect(await LastSyncCompleted.didComplete()).toBe(true);
    });

    it('a sync that starts and never finishes leaves the flag down', async () => {
        await LastSyncCompleted.set();
        await onSyncStarted();
        expect(await LastSyncCompleted.didComplete()).toBe(false);
    });

    it('an upload-only background sync does not set the flag — it pulls nothing', async () => {
        await onSyncStarted();
        await onSyncFinished(SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB);
        expect(await LastSyncCompleted.didComplete()).toBe(false);
    });

    it('an upload-only sync does not clear a flag an earlier full sync set', async () => {
        await onSyncStarted();
        await onSyncFinished(SyncService.syncSources.SYNC_BUTTON);
        await onSyncFinished(SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB);
        expect(await LastSyncCompleted.didComplete()).toBe(true);
    });
});
