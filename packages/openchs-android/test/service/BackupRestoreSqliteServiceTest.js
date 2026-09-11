/**
 * #2120 — the SQLite fast-sync restore records SQLite as the active backend only once the
 * restored database is ready to use: after the file swap, the checkpoint seed and the
 * settings bootstrap. A failure before that point records nothing, so the next launch does
 * not open a database the restore never finished.
 *
 * Run: npx jest test/service/BackupRestoreSqliteServiceTest.js --selectProjects unit --verbose
 */

jest.mock('react-native-fs', () => ({
    __esModule: true,
    default: {
        DocumentDirectoryPath: '/docs',
        exists: jest.fn(async () => true),
        copyFile: jest.fn(async () => {}),
        unlink: jest.fn(async () => {}),
        moveFile: jest.fn(async () => {}),
        readDir: jest.fn(async () => [{name: 'snapshot.db', path: '/docs/unzipped/snapshot.db'}]),
    },
}));
jest.mock('react-native-zip-archive', () => ({unzip: jest.fn(async () => {})}));
jest.mock('../../src/framework/http/requests', () => ({get: (...args) => mockGet(...args)}));
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {
        logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(),
        logErrorAsInfo: jest.fn(), randomUUID: jest.fn(() => 'random-uuid'),
    },
}));
jest.mock('../../src/framework/bean/Service', () => () => () => {});
jest.mock('../../src/service/BaseService', () => ({
    __esModule: true,
    default: class {
        constructor(db, context) {
            this.db = db;
            this.context = context;
        }
        getService(service) {
            return this.context.getService(service);
        }
    },
}));
jest.mock('../../src/service/SettingsService', () => ({__esModule: true, default: class SettingsService {}}));
jest.mock('../../src/service/MediaService', () => ({__esModule: true, default: class MediaService {}}));
jest.mock('../../src/service/EntitySyncStatusService', () => ({__esModule: true, default: class EntitySyncStatusService {}}));
jest.mock('../../src/framework/db/SqliteFactory', () => ({
    __esModule: true,
    default: {getDbFullPath: () => '/docs/avni_sqlite.db'},
}));
jest.mock('../../src/service/SqliteMigrationService', () => ({
    __esModule: true,
    default: {persistStateForUser: jest.fn(async () => {}), commitStateForUser: jest.fn(async () => {})},
    BACKENDS: {REALM: 'realm', SQLITE: 'sqlite'},
}));

const mockGet = jest.fn();

const BackupRestoreSqliteService = require('../../src/service/BackupRestoreSqliteService').default;
const SettingsService = require('../../src/service/SettingsService').default;
const MediaService = require('../../src/service/MediaService').default;
const EntitySyncStatusService = require('../../src/service/EntitySyncStatusService').default;
const SqliteMigrationService = require('../../src/service/SqliteMigrationService').default;

function build() {
    const settings = {
        serverURL: 'https://server',
        userId: 'test-user',
        idpType: 'cognito',
        clone() { return {...this}; },
    };
    const settingsService = {
        getSettings: jest.fn(() => settings),
        init: jest.fn(async () => {}),
        saveOrUpdate: jest.fn(),
    };
    const services = new Map([
        [SettingsService, settingsService],
        [MediaService, {downloadFromUrl: jest.fn(async () => {})}],
        [EntitySyncStatusService, {setup: jest.fn()}],
    ]);
    const service = new BackupRestoreSqliteService({}, {getService: (cls) => services.get(cls)});
    service._readSnapshotUsername = jest.fn(async () => 'test-user');
    const onRestoreCompleted = jest.fn(async () => {});
    const onRestoreFailure = jest.fn(async () => {});
    service.subscribeOnRestore(onRestoreCompleted);
    service.subscribeOnRestoreFailure(onRestoreFailure);
    return {service, settingsService, onRestoreCompleted, onRestoreFailure, cb: jest.fn()};
}

describe('SQLite fast-sync restore commits the backend last (#2120)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockImplementation(async (url) => url.endsWith('/exists') ? 'true' : 'https://signed-url');
    });

    it('records SQLite as active only after the settings bootstrap succeeds', async () => {
        const {service, settingsService, onRestoreCompleted, cb} = build();

        await service.restore(cb);

        expect(cb).toHaveBeenLastCalledWith(100, 'restoreComplete');
        expect(SqliteMigrationService.persistStateForUser).not.toHaveBeenCalled();
        expect(SqliteMigrationService.commitStateForUser).toHaveBeenCalledTimes(1);
        const [username, state] = SqliteMigrationService.commitStateForUser.mock.calls[0];
        expect(username).toBe('test-user');
        expect(state).toMatchObject({activeBackend: 'sqlite', desiredBackend: 'sqlite', preparedTarget: null});
        const persistOrder = SqliteMigrationService.commitStateForUser.mock.invocationCallOrder[0];
        expect(onRestoreCompleted.mock.invocationCallOrder[0]).toBeLessThan(persistOrder);
        expect(settingsService.saveOrUpdate.mock.invocationCallOrder[0]).toBeLessThan(persistOrder);
    });

    it('records nothing when the settings bootstrap fails after the file swap', async () => {
        const {service, settingsService, onRestoreCompleted, onRestoreFailure, cb} = build();
        const bootstrapFailed = new Error('settings write failed');
        settingsService.saveOrUpdate.mockImplementation(() => { throw bootstrapFailed; });

        await service.restore(cb);

        expect(onRestoreCompleted).toHaveBeenCalled();
        expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
        expect(onRestoreFailure).toHaveBeenCalled();
        expect(cb).toHaveBeenLastCalledWith(100, 'restoreFailed', true, bootstrapFailed);
    });

    // A restore reported complete with no record would open empty Realm at the next launch
    // and later wipe and re-pull the snapshot. Failing here takes the failure path instead.
    it('fails the restore when the record naming SQLite cannot be written', async () => {
        const {service, onRestoreFailure, cb} = build();
        const diskFull = new Error('disk full');
        SqliteMigrationService.commitStateForUser.mockImplementationOnce(async () => { throw diskFull; });

        await service.restore(cb);

        expect(onRestoreFailure).toHaveBeenCalled();
        expect(cb).toHaveBeenLastCalledWith(100, 'restoreFailed', true, diskFull);
    });
});
