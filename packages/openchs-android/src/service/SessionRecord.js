import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import General from '../utility/General';

const STATE_KEY = 'avni.session.state';
const CLOCK_KEY = 'avni.session.clock';

export const SESSION_ESTABLISHED = 'established';
export const SESSION_ENDED = 'ended';

// Distinguishes a session the app lost from one the user ended; an absent state means a device that predates this record.
class SessionRecord {
    static async established() {
        await SessionRecord._write(() => AsyncStorage.setItem(STATE_KEY, SESSION_ESTABLISHED));
    }

    static async ended() {
        await SessionRecord._write(() => AsyncStorage.setItem(STATE_KEY, SESSION_ENDED));
    }

    static async getState() {
        return SessionRecord._read(() => AsyncStorage.getItem(STATE_KEY));
    }

    // The SDK deletes its cached token and drift along with the user, so they are kept here for the event that follows.
    static async recordClock({tokenIssuedAt, clockDriftSeconds}) {
        await SessionRecord._write(() => AsyncStorage.setItem(CLOCK_KEY, JSON.stringify({tokenIssuedAt, clockDriftSeconds})));
    }

    static async getClock() {
        const clock = await SessionRecord._read(() => AsyncStorage.getItem(CLOCK_KEY).then((value) => JSON.parse(value)));
        return _.isPlainObject(clock) ? clock : {};
    }

    static async _write(write) {
        try {
            await write();
        } catch (e) {
            General.logWarn("SessionRecord", `Failed to write: ${e.message}`);
        }
    }

    static async _read(read) {
        try {
            return await read();
        } catch (e) {
            General.logWarn("SessionRecord", `Failed to read: ${e.message}`);
            return undefined;
        }
    }
}

export default SessionRecord;
