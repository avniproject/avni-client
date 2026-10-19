/**
 * Login decides "fresh phone, restore a fast sync file" from the database the app is running
 * on. When a SQLite user's database failed to open at launch, the app runs on Realm, which is
 * empty for them, and the restore would replace the SQLite file holding their unsynced work.
 *
 * Run: npx jest test/action/LoginActionsDumpRestoreTest.js --selectProjects unit
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
jest.mock('../../src/utility/Analytics', () => ({firebaseEvents: {}, logEvent: jest.fn()}));

let mockActiveBackend;
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => ({getActiveBackend: () => mockActiveBackend, beanRegistry: {register: () => {}}})},
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const {LoginActions} = require('../../src/action/LoginActions');
const SettingsService = require('../../src/service/SettingsService').default;
const BackupRestoreRealmService = require('../../src/service/BackupRestoreRealmService').default;
const BackupRestoreSqliteService = require('../../src/service/BackupRestoreSqliteService').default;
const SqliteMigrationService = require('../../src/service/SqliteMigrationService').default;

const USER = 'anjali@phulwari';

function login({neverSynced = true} = {}) {
    const sqliteRestore = {restore: jest.fn()};
    const services = new Map([
        [SettingsService, {getSettings: () => ({userId: USER})}],
        [BackupRestoreRealmService, {isDatabaseNeverSynced: () => neverSynced}],
        [BackupRestoreSqliteService, sqliteRestore],
    ]);
    const context = {get: (s) => services.get(s)};
    const action = {onLoginProgress: jest.fn(), checkForRetry: jest.fn()};
    const successCb = jest.fn();
    return {
        run: () => LoginActions.startDumpRestore(context, action, 'source', successCb),
        sqliteRestore, successCb,
    };
}

describe('fast sync restore at login', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        mockActiveBackend = 'realm';
    });

    it('restores on a fresh phone', async () => {
        const {run, sqliteRestore, successCb} = login();

        await run();

        expect(sqliteRestore.restore).toHaveBeenCalled();
        expect(successCb).not.toHaveBeenCalled();
    });

    it('restores for a SQLite user whose SQLite opened but holds nothing, as after a full reset', async () => {
        await SqliteMigrationService.persistStateForUser(USER, {activeBackend: 'sqlite', desiredBackend: 'sqlite'});
        mockActiveBackend = 'sqlite';
        const {run, sqliteRestore} = login();

        await run();

        expect(sqliteRestore.restore).toHaveBeenCalled();
    });

    it('never restores over a SQLite user whose database failed to open at launch', async () => {
        await SqliteMigrationService.persistStateForUser(USER, {activeBackend: 'sqlite', desiredBackend: 'sqlite'});
        const {run, sqliteRestore, successCb} = login();

        await run();

        expect(sqliteRestore.restore).not.toHaveBeenCalled();
        expect(successCb).toHaveBeenCalledWith('source');
    });

    it('does not restore when it cannot read which database the user is on', async () => {
        const original = AsyncStorage.getItem.getMockImplementation?.();
        jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async (key) => {
            if (key.startsWith('avni.sqliteMigration.')) throw new Error('storage unavailable');
            return original ? original(key) : null;
        });
        const {run, sqliteRestore, successCb} = login();

        await run();

        expect(sqliteRestore.restore).not.toHaveBeenCalled();
        expect(successCb).toHaveBeenCalledWith('source');
        AsyncStorage.getItem.mockRestore();
    });
});
