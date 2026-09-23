import AsyncStorage from '@react-native-async-storage/async-storage';
import General from '../utility/General';

const KEY = 'avni.sessionEstablished';

// A deliberate sign-out and a session the app lost leave the device looking identical — tokens
// gone, data intact — so the launch path cannot tell them apart on its own. Set once the IdP has
// accepted credentials and cleared when the user signs out on purpose, this says whether a
// session the user did not end is missing.
class SessionEstablished {
    static async set() {
        try {
            await AsyncStorage.setItem(KEY, 'true');
        } catch (e) {
            General.logWarn("SessionEstablished", `Failed to record session: ${e.message}`);
        }
    }

    static async clear() {
        try {
            await AsyncStorage.removeItem(KEY);
        } catch (e) {
            General.logWarn("SessionEstablished", `Failed to clear session: ${e.message}`);
        }
    }

    static async wasEstablished() {
        try {
            return (await AsyncStorage.getItem(KEY)) === 'true';
        } catch (e) {
            General.logWarn("SessionEstablished", `Failed to read session: ${e.message}`);
            return false;
        }
    }
}

export default SessionEstablished;
