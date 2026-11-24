import AsyncStorage from '@react-native-async-storage/async-storage';
import General from '../utility/General';

const KEY = 'avni.currentUsername';

// The logged-in username, held outside both databases. Per-user migration state is
// keyed on it at launch, before we know which backend holds the current user's data —
// reading it out of a database means reading whoever that database last belonged to.
class SessionUsername {
    static async set(username) {
        try {
            const trimmed = username && username.trim();
            if (!trimmed) return;
            await AsyncStorage.setItem(KEY, trimmed);
        } catch (e) {
            General.logWarn("SessionUsername", `Failed to record session username: ${e.message}`);
        }
    }

    static async get() {
        try {
            return await AsyncStorage.getItem(KEY);
        } catch (e) {
            General.logWarn("SessionUsername", `Failed to read session username: ${e.message}`);
            return null;
        }
    }

    static async clear() {
        try {
            await AsyncStorage.removeItem(KEY);
        } catch (e) {
            General.logWarn("SessionUsername", `Failed to clear session username: ${e.message}`);
        }
    }
}

export default SessionUsername;
