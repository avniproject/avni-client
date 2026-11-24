import AsyncStorage from '@react-native-async-storage/async-storage';
import LastSyncCompleted from '../../src/service/LastSyncCompleted';

describe('LastSyncCompleted', () => {
    beforeEach(async () => await AsyncStorage.clear());

    it('reads false before any sync has ever run', async () => {
        expect(await LastSyncCompleted.didComplete()).toBe(false);
    });

    it('reads true once a sync has completed', async () => {
        await LastSyncCompleted.set();
        expect(await LastSyncCompleted.didComplete()).toBe(true);
    });

    it('reads false while a sync is in flight', async () => {
        await LastSyncCompleted.set();
        await LastSyncCompleted.clear();
        expect(await LastSyncCompleted.didComplete()).toBe(false);
    });

    it('stays false when a sync starts and never finishes', async () => {
        await LastSyncCompleted.set();
        await LastSyncCompleted.clear();   // START_SYNC
        // the app is killed here — no SYNC_COMPLETED, no SYNC_FAILED
        expect(await LastSyncCompleted.didComplete()).toBe(false);
    });

    it('reads false rather than throwing when storage is unavailable', async () => {
        const boom = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('no storage'));
        expect(await LastSyncCompleted.didComplete()).toBe(false);
        boom.mockRestore();
    });

    it('does not throw when a write fails', async () => {
        const boom = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
        await expect(LastSyncCompleted.set()).resolves.toBeUndefined();
        boom.mockRestore();
    });
});
