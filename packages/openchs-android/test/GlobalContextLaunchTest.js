/**
 * #2120 — launch opens the backend the state record commits to before anything can
 * render or schedule on the wrong database, and starts no migration work. A failed SQLite
 * restore opens that same committed backend, which the restore never got to change.
 *
 * Run: npx jest test/GlobalContextLaunchTest.js --selectProjects unit --verbose
 */

const mockBeans = new Map();
const mockUpdateDatabase = jest.fn();
jest.mock('../src/framework/bean/BeanRegistry', () => ({
    __esModule: true,
    default: class {
        init() {}
        getService(name) { return mockBeans.get(name); }
        updateDatabase(db) { mockUpdateDatabase(db); }
        setReduxStore() {}
        get beansMap() { return mockBeans; }
    },
}));
// jestSetupFile mocks Analytics as {}; GlobalContext awaits initAnalytics.
jest.mock('../src/utility/Analytics', () => ({
    initAnalytics: jest.fn(async () => {}),
    updateAnalyticsDatabase: jest.fn(),
}));
jest.mock('../src/utility/General', () => ({
    __esModule: true,
    default: {logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn()},
}));
jest.mock('../src/utility/perf', () => ({
    __esModule: true,
    default: {mark: jest.fn(), time: (_name, fn) => fn()},
}));
jest.mock('../src/service/EncryptionService', () => ({
    __esModule: true,
    default: {removeStaleKeyIfDbsPlaintext: jest.fn(async () => {})},
}));
jest.mock('../src/framework/db/SqliteFactory', () => ({
    __esModule: true,
    default: {createSqliteProxy: jest.fn(async () => ({kind: 'sqlite', close: jest.fn()}))},
}));

const GlobalContext = require('../src/GlobalContext').default;

function wireBeans(migrationService) {
    mockBeans.clear();
    ['entityService', 'individualService', 'syncService', 'customDashboardService', 'dashboardSectionCardMappingService']
        .forEach(name => mockBeans.set(name, {}));
    mockBeans.set('backupRestoreRealmService', {subscribeOnRestore: jest.fn(), subscribeOnRestoreFailure: jest.fn()});
    mockBeans.set('backupRestoreSqliteService', {subscribeOnRestore: jest.fn(), subscribeOnRestoreFailure: jest.fn()});
    mockBeans.set('sqliteMigrationService', migrationService);
}

const realmFactory = {createRealm: jest.fn(async () => ({kind: 'realm'}))};

describe('launch opens the committed backend (#2120)', () => {
    it('opens the committed backend before the store exists, and starts no migration work', async () => {
        const order = [];
        const migrationService = {
            openCommittedBackend: jest.fn(async () => { order.push('open committed backend'); }),
            resumeIfPending: jest.fn(async () => {}),
        };
        wireBeans(migrationService);
        const appStore = {create: jest.fn(() => { order.push('store'); return {}; })};

        await new GlobalContext().initialiseGlobalContext(appStore, realmFactory);

        expect(order).toEqual(['open committed backend', 'store']);
        expect(migrationService.resumeIfPending).not.toHaveBeenCalled();
    });

    it('still starts, on Realm, when the committed backend cannot be read', async () => {
        wireBeans({openCommittedBackend: jest.fn(async () => { throw new Error('storage unavailable'); })});
        const appStore = {create: jest.fn(() => ({}))};
        const context = new GlobalContext();

        await context.initialiseGlobalContext(appStore, realmFactory);

        expect(appStore.create).toHaveBeenCalled();
        expect(context.getActiveBackend()).toBe('realm');
    });
});

describe('a failed SQLite restore (#2120)', () => {
    // The restore writes its record only on success, so after a failure the record still
    // names whatever the device was committed to before the restore began.
    async function restoreSwapsFileThenFails(committedBackend) {
        const context = new GlobalContext();
        const migrationService = {
            openCommittedBackend: jest.fn(async () => context.switchBackend(committedBackend)),
        };
        wireBeans(migrationService);
        await context.initialiseGlobalContext({create: jest.fn(() => ({}))}, realmFactory);
        const sqliteRestoreService = mockBeans.get('backupRestoreSqliteService');
        const onRestored = sqliteRestoreService.subscribeOnRestore.mock.calls[0][0];
        const onRestoreFailed = sqliteRestoreService.subscribeOnRestoreFailure.mock.calls[0][0];

        // The file swap flips the runtime to SQLite; a later step of the restore then fails.
        await onRestored();
        migrationService.openCommittedBackend.mockClear();
        await onRestoreFailed();

        return {context, migrationService};
    }

    it('opens Realm when the record commits to Realm, as on a fresh install', async () => {
        const {context, migrationService} = await restoreSwapsFileThenFails('realm');

        expect(migrationService.openCommittedBackend).toHaveBeenCalledTimes(1);
        expect(context.getActiveBackend()).toBe('realm');
        expect(mockUpdateDatabase).toHaveBeenLastCalledWith(expect.objectContaining({kind: 'realm'}));
    });

    // A SQLite user whose data a full reset wiped reads as never synced at the next login,
    // so the restore can start from SQLite; failing it must not strand them on stale Realm.
    it('stays on SQLite when the record commits to SQLite', async () => {
        const {context, migrationService} = await restoreSwapsFileThenFails('sqlite');

        expect(migrationService.openCommittedBackend).toHaveBeenCalledTimes(1);
        expect(context.getActiveBackend()).toBe('sqlite');
    });
});

describe('reopening the databases after a restore never throws (#2120)', () => {
    const SqliteFactory = require('../src/framework/db/SqliteFactory').default;

    async function booted(committedBackend) {
        const context = new GlobalContext();
        wireBeans({openCommittedBackend: jest.fn(async () => context.switchBackend(committedBackend))});
        await context.initialiseGlobalContext({create: jest.fn(() => ({}))}, realmFactory);
        const sqliteRestoreService = mockBeans.get('backupRestoreSqliteService');
        return {
            context,
            onRestored: sqliteRestoreService.subscribeOnRestore.mock.calls[0][0],
            onRestoreFailed: sqliteRestoreService.subscribeOnRestoreFailure.mock.calls[0][0],
        };
    }

    afterEach(() => {
        realmFactory.createRealm.mockImplementation(async () => ({kind: 'realm'}));
        SqliteFactory.createSqliteProxy.mockImplementation(async () => ({kind: 'sqlite', close: jest.fn()}));
    });

    // Otherwise the restore's failure callback never reaches login, which waits on it forever.
    it('finishes a failed restore when Realm cannot be reopened', async () => {
        const {context, onRestoreFailed} = await booted('sqlite');
        realmFactory.createRealm.mockImplementation(async () => { throw new Error('realm locked'); });

        await expect(onRestoreFailed()).resolves.toBeUndefined();

        expect(context.getActiveBackend()).toBe('sqlite');
        expect(mockUpdateDatabase).toHaveBeenLastCalledWith(expect.objectContaining({kind: 'sqlite'}));
    });

    it('drops a SQLite handle it could not reopen, and says the runtime is on Realm', async () => {
        const {context, onRestored} = await booted('realm');
        SqliteFactory.createSqliteProxy.mockImplementation(async () => { throw new Error('file locked'); });

        await onRestored();

        expect(context.sqliteDb).toBeNull();
        expect(context.getActiveBackend()).toBe('realm');
        expect(mockUpdateDatabase).toHaveBeenLastCalledWith(expect.objectContaining({kind: 'realm'}));
    });

    it('opens SQLite on a later try when it failed to open at launch', async () => {
        SqliteFactory.createSqliteProxy.mockImplementationOnce(async () => { throw new Error('file locked'); });
        const {context} = await booted('realm');
        expect(() => context.switchBackend('sqlite')).toThrow('sqliteDb not initialised');

        expect(await context.openSqliteIfMissing()).toBe(true);
        context.switchBackend('sqlite');

        expect(context.getActiveBackend()).toBe('sqlite');
    });
});
