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

const realmFactory = {createRealm: jest.fn(async () => ({kind: 'realm', close: jest.fn()}))};

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
        realmFactory.createRealm.mockImplementation(async () => ({kind: 'realm', close: jest.fn()}));
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

    // This path closes the Realm before reopening it, so binding the old handle would hand
    // the registry a closed database that fails at some unrelated read much later.
    it('binds nothing when the Realm it just closed cannot be reopened', async () => {
        const {context} = await booted('realm');
        const onRealmRecreated = mockBeans.get('backupRestoreRealmService').subscribeOnRestore.mock.calls[0][0];
        realmFactory.createRealm.mockImplementation(async () => { throw new Error('realm locked'); });
        mockUpdateDatabase.mockClear();

        await expect(onRealmRecreated()).resolves.toBeUndefined();

        expect(context.db).toBeNull();
        expect(mockUpdateDatabase).not.toHaveBeenCalled();
    });

    // The SQLite restore's failure callback arrives with Realm open and untouched — that
    // flow never goes near it. A failed reopen there must not throw a working handle away.
    it('keeps the open Realm when a reopen fails and nothing had closed it', async () => {
        const {context, onRestoreFailed} = await booted('realm');
        const openRealm = context.db;
        realmFactory.createRealm.mockImplementation(async () => { throw new Error('transient'); });

        await expect(onRestoreFailed()).resolves.toBeUndefined();

        expect(context.db).toBe(openRealm);
        expect(mockUpdateDatabase).toHaveBeenLastCalledWith(openRealm);
    });

    // The caller reports the restore's outcome to the user off this.
    it('tells the restore it failed when SQLite will not open on the snapshot', async () => {
        const {onRestored} = await booted('realm');
        SqliteFactory.createSqliteProxy.mockImplementation(async () => { throw new Error('file locked'); });

        expect(await onRestored()).toBe(false);
    });

    // The registry holding null is worse than it holding the handle it had: every service
    // reads through it, and _activeBackend would say Realm as if the move had happened.
    it('refuses to move to a Realm that is not open, and stays where it is', async () => {
        const {context} = await booted('realm');
        context.switchBackend('sqlite');
        context.db = null;
        mockUpdateDatabase.mockClear();

        expect(() => context.switchBackend('realm')).toThrow('the database is not open');

        expect(mockUpdateDatabase).not.toHaveBeenCalled();
        expect(context.getActiveBackend()).toBe('sqlite');
    });

    // The encryption swap drops both handles and reopens them. A Realm that does not come
    // back leaves nothing for the leg to fall back to.
    it('refuses after a failed reopen leaves no Realm behind', async () => {
        const {context} = await booted('realm');
        context.switchBackend('sqlite');
        context.db = null;
        context.sqliteDb = null;
        realmFactory.createRealm.mockImplementation(async () => { throw new Error('stale key'); });
        await context.reinitializeDatabase(realmFactory);
        mockUpdateDatabase.mockClear();

        expect(() => context.switchBackend('realm')).toThrow('the database is not open');

        expect(mockUpdateDatabase).not.toHaveBeenCalled();
    });

    it('opens SQLite on a later try when it failed to open at launch', async () => {
        SqliteFactory.createSqliteProxy.mockImplementationOnce(async () => { throw new Error('file locked'); });
        const {context} = await booted('realm');
        expect(() => context.switchBackend('sqlite')).toThrow('sqliteDb not initialised');

        expect(await context.openSqliteIfMissing()).toBe(true);
        context.switchBackend('sqlite');

        expect(context.getActiveBackend()).toBe('sqlite');
    });

    // Refusing the switch is half of it. Nothing reopened Realm after a failed reinit, so the
    // fall back every abandoned leg depends on would stay refused for the rest of the process.
    it('opens Realm on a later try after a failed reopen left none', async () => {
        const {context} = await booted('realm');
        context.switchBackend('sqlite');
        const onRealmRecreated = mockBeans.get('backupRestoreRealmService').subscribeOnRestore.mock.calls[0][0];
        realmFactory.createRealm.mockImplementationOnce(async () => { throw new Error('realm locked'); });
        await onRealmRecreated();
        expect(context.db).toBeNull();

        expect(await context.openRealmIfMissing()).toBe(true);
        context.switchBackend('realm');

        expect(context.getActiveBackend()).toBe('realm');
    });

    // Review of #2120: switchBackend returns early when the backend has not changed, so a
    // reopen of the one already active left every service reading the handle that died.
    it('binds a reopened Realm when Realm is already the active backend', async () => {
        const {context} = await booted('realm');
        context.db = null;
        context.sqliteDb = null;
        realmFactory.createRealm.mockImplementationOnce(async () => { throw new Error('stale key'); });
        expect(await context.reinitializeDatabase(realmFactory)).toBe(false);
        mockUpdateDatabase.mockClear();

        expect(await context.openRealmIfMissing()).toBe(true);

        expect(mockUpdateDatabase).toHaveBeenCalledTimes(1);
        expect(mockUpdateDatabase).toHaveBeenCalledWith(context.db);
        expect(context.db.kind).toBe('realm');
    });

    it('binds a reopened SQLite when SQLite is already the active backend', async () => {
        const {context} = await booted('sqlite');
        context.sqliteDb = null;
        mockUpdateDatabase.mockClear();

        expect(await context.openSqliteIfMissing()).toBe(true);

        expect(mockUpdateDatabase).toHaveBeenCalledTimes(1);
        expect(mockUpdateDatabase).toHaveBeenCalledWith(context.sqliteDb);
    });

    // The inactive backend is bound by the switch that makes it active, not by its reopen.
    it('does not bind a reopened backend that is not the active one', async () => {
        const {context} = await booted('sqlite');
        context.db = null;
        mockUpdateDatabase.mockClear();

        expect(await context.openRealmIfMissing()).toBe(true);

        expect(mockUpdateDatabase).not.toHaveBeenCalled();
        expect(context.getActiveBackend()).toBe('sqlite');
    });

    it('reports a failed bind of the reopened database', async () => {
        const {context} = await booted('realm');
        context.db = null;
        mockUpdateDatabase.mockImplementationOnce(() => { throw new Error('repository rebuild failed'); });

        expect(await context.openRealmIfMissing()).toBe(false);
    });
});
