/**
 * clearData() is the only thing standing between a new user and the previous one's rows.
 * Both databases survive a plain logout, and either is one switchBackend() away from being
 * read, so a login path that skips this wipe silently reintroduces #2083.
 *
 * Run: npx jest test/service/SyncServiceClearDataTest.js --selectProjects unit --verbose
 */

// Native leaf modules pulled in transitively by SyncService's import tree.
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
jest.mock('@react-native-async-storage/async-storage', () => {
    const store = new Map();
    return {
        __store: store,
        getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
        setItem: jest.fn(async (k, v) => { store.set(k, v); }),
        removeItem: jest.fn(async (k) => { store.delete(k); }),
        getAllKeys: jest.fn(async () => Array.from(store.keys())),
        multiRemove: jest.fn(async (keys) => { keys.forEach((k) => store.delete(k)); }),
    };
});

const mockGlobalContext = {
    switchBackend: jest.fn(),
    openSqliteIfMissing: jest.fn(async () => true),
    getActiveBackend: jest.fn(() => 'realm'),
    beanRegistry: {register: jest.fn()},
};
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const General = require('../../src/utility/General').default;
const SyncService = require('../../src/service/SyncService').default;
const SqliteMigrationService = require('../../src/service/SqliteMigrationService').default;
const SessionUsername = require('../../src/service/SessionUsername').default;

const MIGRATION_KEY = 'avni.sqliteMigration.anjali@phulwari';
const SESSION_KEY = 'avni.currentUsername';

// Records which backend was active each time a wipe ran, so a test can assert both were
// cleared rather than the same one twice.
function buildSyncService({failOn = null} = {}) {
    const svc = Object.create(SyncService.prototype);
    const wipedBackends = [];
    svc.entityService = {
        clearDataIn: jest.fn(() => {
            const backend = mockGlobalContext.getActiveBackend();
            if (backend === failOn) throw new Error(`${backend} is locked`);
            wipedBackends.push(backend);
        }),
    };
    svc.entitySyncStatusService = {setup: jest.fn()};
    svc.ruleEvaluationService = {init: jest.fn()};
    svc.messageService = {init: jest.fn()};
    svc.ruleService = {init: jest.fn()};
    svc.wipedBackends = wipedBackends;
    return svc;
}

describe('clearData wipes both backends (#2083)', () => {
    let activeBackend;

    beforeEach(async () => {
        jest.clearAllMocks();
        AsyncStorage.__store.clear();
        activeBackend = 'realm';
        mockGlobalContext.getActiveBackend.mockImplementation(() => activeBackend);
        mockGlobalContext.switchBackend.mockImplementation((target) => { activeBackend = target; });
        await SqliteMigrationService.persistStateForUser('anjali@phulwari', {activeBackend: 'sqlite'});
        await SessionUsername.set('anjali@phulwari');
    });

    it('clears both backends and lands on Realm, starting from Realm', async () => {
        const svc = buildSyncService();

        await svc.clearData();

        expect(svc.wipedBackends.sort()).toEqual(['realm', 'sqlite']);
        expect(activeBackend).toBe('realm');
    });

    it('clears both backends and lands on Realm, starting from SQLite', async () => {
        activeBackend = 'sqlite';
        const svc = buildSyncService();

        await svc.clearData();

        expect(svc.wipedBackends.sort()).toEqual(['realm', 'sqlite']);
        expect(activeBackend).toBe('realm');
    });

    it('reseeds checkpoints on each backend it clears', async () => {
        const svc = buildSyncService();

        await svc.clearData();

        expect(svc.entitySyncStatusService.setup).toHaveBeenCalledTimes(2);
    });

    it('drops every migration record and the session username', async () => {
        const svc = buildSyncService();

        await svc.clearData();

        expect(AsyncStorage.__store.has(MIGRATION_KEY)).toBe(false);
        expect(AsyncStorage.__store.has(SESSION_KEY)).toBe(false);
    });

    // A record outliving a half-finished run points the next launch at a backend that may
    // still hold the previous user's rows.
    it('drops the migration record before it starts wiping', async () => {
        const svc = buildSyncService();
        let recordPresentAtFirstWipe = null;
        svc.entityService.clearDataIn.mockImplementation(() => {
            if (recordPresentAtFirstWipe === null) {
                recordPresentAtFirstWipe = AsyncStorage.__store.has(MIGRATION_KEY);
            }
        });

        await svc.clearData();

        expect(recordPresentAtFirstWipe).toBe(false);
    });

    describe('one backend failing does not spare the other', () => {
        it('still clears SQLite when Realm cannot be cleared', async () => {
            const svc = buildSyncService({failOn: 'realm'});

            await svc.clearData();

            expect(svc.wipedBackends).toEqual(['sqlite']);
            expect(activeBackend).toBe('realm');
        });

        it('still clears Realm when SQLite cannot be cleared', async () => {
            activeBackend = 'sqlite';
            const svc = buildSyncService({failOn: 'sqlite'});

            await svc.clearData();

            expect(svc.wipedBackends).toEqual(['realm']);
            expect(activeBackend).toBe('realm');
        });

        it('names the backend the failure came from', async () => {
            const svc = buildSyncService({failOn: 'sqlite'});

            await svc.clearData();

            const messages = General.logError.mock.calls.map(([, message]) => message);
            expect(messages.some((m) => m.includes('sqlite') && !m.includes('realm'))).toBe(true);
        });

        it('clears the backend it can reach when the other will not open', async () => {
            const svc = buildSyncService();
            mockGlobalContext.switchBackend.mockImplementation((target) => {
                if (target === 'sqlite') throw new Error('sqliteDb not initialised');
                activeBackend = target;
            });

            await svc.clearData();

            expect(svc.wipedBackends).toEqual(['realm']);
        });
    });
});
