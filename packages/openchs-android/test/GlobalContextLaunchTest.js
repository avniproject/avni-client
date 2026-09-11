/**
 * #2120 — launch opens the backend the state record commits to before anything can
 * render or schedule on the wrong database, and starts no migration work. A failed SQLite
 * restore puts the runtime back on Realm, which is what the state record still names.
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
            reconcileBackendOnLaunch: jest.fn(async () => { order.push('reconcile'); }),
            resumeIfPending: jest.fn(async () => {}),
        };
        wireBeans(migrationService);
        const appStore = {create: jest.fn(() => { order.push('store'); return {}; })};

        await new GlobalContext().initialiseGlobalContext(appStore, realmFactory);

        expect(order).toEqual(['reconcile', 'store']);
        expect(migrationService.resumeIfPending).not.toHaveBeenCalled();
    });

    it('still starts, on Realm, when the committed backend cannot be read', async () => {
        wireBeans({reconcileBackendOnLaunch: jest.fn(async () => { throw new Error('storage unavailable'); })});
        const appStore = {create: jest.fn(() => ({}))};
        const context = new GlobalContext();

        await context.initialiseGlobalContext(appStore, realmFactory);

        expect(appStore.create).toHaveBeenCalled();
        expect(context.getActiveBackend()).toBe('realm');
    });
});

describe('a failed SQLite restore (#2120)', () => {
    it('puts the runtime back on Realm, which the state record still names', async () => {
        wireBeans({reconcileBackendOnLaunch: jest.fn(async () => {})});
        const context = new GlobalContext();
        await context.initialiseGlobalContext({create: jest.fn(() => ({}))}, realmFactory);
        const sqliteRestoreService = mockBeans.get('backupRestoreSqliteService');
        const onRestored = sqliteRestoreService.subscribeOnRestore.mock.calls[0][0];
        const onRestoreFailed = sqliteRestoreService.subscribeOnRestoreFailure.mock.calls[0][0];

        // The file swap flips the runtime to SQLite; a later step of the restore then fails.
        await onRestored();
        expect(context.getActiveBackend()).toBe('sqlite');
        mockUpdateDatabase.mockClear();

        await onRestoreFailed();

        expect(context.getActiveBackend()).toBe('realm');
        expect(mockUpdateDatabase).toHaveBeenLastCalledWith(expect.objectContaining({kind: 'realm'}));
    });
});
