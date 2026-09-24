import AsyncStorage from '@react-native-async-storage/async-storage';
import General from '../utility/General';

const KEY = 'avni.lastSyncCompleted';

// Whether the MOST RECENT sync finished, as distinct from whether any sync ever has.
// A phone that synced successfully months ago and has failed every attempt since satisfies
// "ever" and is exactly the device whose catchment dump must not be published (#2141).
//
// Cleared when a sync starts and set when one finishes, so the failure modes that write no
// telemetry row at all — the app killed mid-sync, the process reaped — leave the flag down
// rather than leaving the previous sync's "complete" standing as the newest answer.
class LastSyncCompleted {
    static async set() {
        try {
            await AsyncStorage.setItem(KEY, 'true');
        } catch (e) {
            General.logWarn("LastSyncCompleted", `Failed to record sync completion: ${e.message}`);
        }
    }

    static async clear() {
        try {
            await AsyncStorage.removeItem(KEY);
        } catch (e) {
            General.logWarn("LastSyncCompleted", `Failed to clear sync completion: ${e.message}`);
        }
    }

    // Absent or unreadable reads as false: the guard this feeds must fail closed.
    static async didComplete() {
        try {
            return (await AsyncStorage.getItem(KEY)) === 'true';
        } catch (e) {
            General.logWarn("LastSyncCompleted", `Failed to read sync completion: ${e.message}`);
            return false;
        }
    }
}

export default LastSyncCompleted;
