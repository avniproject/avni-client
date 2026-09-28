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
jest.mock('react-native-zip-archive', () => ({unzip: jest.fn(async () => {}), zip: jest.fn(async () => {})}));
jest.mock('../../src/framework/http/requests', () => ({
    get: (...args) => mockGet(...args),
    getJSON: (...args) => mockGetJSON(...args),
}));
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
jest.mock('../../src/service/UserInfoService', () => ({__esModule: true, default: class UserInfoService {}}));
jest.mock('../../src/service/SubjectTypeService', () => ({__esModule: true, default: class SubjectTypeService {}}));
jest.mock('../../src/service/IndividualService', () => ({__esModule: true, default: class IndividualService {}}));
jest.mock('../../src/service/SubjectMigrationService', () => ({__esModule: true, default: class SubjectMigrationService {}}));
jest.mock('../../src/service/FormMappingService', () => ({__esModule: true, default: class FormMappingService {}}));
jest.mock('../../src/service/MediaQueueService', () => ({
    __esModule: true,
    default: class MediaQueueService {
        static DumpType = {
            Catchment: 'catchment',
            CatchmentSqlite: 'catchmentSqlite',
            Adhoc: 'Adhoc',
        };
        getDumpUploadUrl() {}
        foregroundUpload() {}
    },
}));
jest.mock('../../src/framework/db/SqliteFactory', () => ({
    __esModule: true,
    default: {getDbFullPath: () => '/docs/avni_sqlite.db'},
}));
jest.mock('../../src/service/SqliteMigrationService', () => ({
    __esModule: true,
    default: {persistStateForUser: jest.fn(async () => {}), commitStateForUser: jest.fn(async () => {})},
    BACKENDS: {REALM: 'realm', SQLITE: 'sqlite'},
}));

const mockGlobalContext = {sqliteDb: null};
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));

const mockGet = jest.fn();
const mockGetJSON = jest.fn();

const BackupRestoreSqliteService = require('../../src/service/BackupRestoreSqliteService').default;
const SettingsService = require('../../src/service/SettingsService').default;
const MediaService = require('../../src/service/MediaService').default;
const EntitySyncStatusService = require('../../src/service/EntitySyncStatusService').default;
const UserInfoService = require('../../src/service/UserInfoService').default;
const SubjectTypeService = require('../../src/service/SubjectTypeService').default;
const IndividualService = require('../../src/service/IndividualService').default;
const SubjectMigrationService = require('../../src/service/SubjectMigrationService').default;
const FormMappingService = require('../../src/service/FormMappingService').default;
const SqliteMigrationService = require('../../src/service/SqliteMigrationService').default;
const MediaQueueService = require('../../src/service/MediaQueueService').default;
const _ = require('lodash');
const {UserInfo} = require('openchs-models');
const {PEER_OWNED_SYNC_STATUS_SCHEMAS} = require('../../src/service/BackupRestoreSqliteService');

// A dump only carries someone else's caseload when a subject type is directly assignable, which
// is the exception; helpers default to none, and the cleanup's own tests supply their own.
function noDirectlyAssignableSubjectTypes() {
    return [
        [SubjectTypeService, {getAllDirectlyAssignable: jest.fn(() => []), getAll: jest.fn(() => [])}],
        [IndividualService, {getAllBySubjectType: jest.fn(() => ({map: () => []}))}],
        [SubjectMigrationService, {removeEntitiesFor: jest.fn()}],
        [FormMappingService, {getFormMappingsForSubjectType: jest.fn(() => ({map: () => []}))}],
    ];
}

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
        [UserInfoService, {getUserInfo: jest.fn(() => UserInfo.createEmptyInstance()), saveOrUpdate: jest.fn()}],
        ...noDirectlyAssignableSubjectTypes(),
    ]);
    const service = new BackupRestoreSqliteService({}, {getService: (cls) => services.get(cls)});
    service._readSnapshotUsername = jest.fn(async () => 'test-user');
    const onRestoreCompleted = jest.fn(async () => {});
    const onRestoreFailure = jest.fn(async () => {});
    service.subscribeOnRestore(onRestoreCompleted);
    service.subscribeOnRestoreFailure(onRestoreFailure);
    return {service, settingsService, onRestoreCompleted, onRestoreFailure, cb: jest.fn()};
}

function serviceWith({db, mediaQueueService} = {}) {
    const defaultMediaQueueService = {
        getDumpUploadUrl: jest.fn(async () => 'https://s3/put'),
        foregroundUpload: jest.fn(async () => {}),
    };
    const services = new Map([
        [MediaQueueService, {...defaultMediaQueueService, ...mediaQueueService}],
    ]);
    const defaultDb = {writeCopyTo: jest.fn()};
    return new BackupRestoreSqliteService({...defaultDb, ...db}, {getService: (cls) => services.get(cls)});
}

describe('SQLite fast-sync restore commits the backend last (#2120)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobalContext.sqliteDb = null;
        mockGet.mockImplementation(async (url) => url.endsWith('/exists') ? 'true' : 'https://signed-url');
        mockGetJSON.mockImplementation(async () => ({url: 'https://signed-url', tier: 'perUser'}));
    });

    // -wal and -shm belong to the file they were written beside. Left next to the snapshot they
    // are read as its own, and the backup taken under an open connection can miss the WAL.
    it('closes the live connection and clears its -wal/-shm before the file swap', async () => {
        const fs = require('react-native-fs').default;
        const close = jest.fn();
        mockGlobalContext.sqliteDb = {close};
        const {service, cb} = build();

        await service.restore(cb);

        expect(close).toHaveBeenCalled();
        expect(mockGlobalContext.sqliteDb).toBeNull();
        expect(fs.unlink).toHaveBeenCalledWith('/docs/avni_sqlite.db-wal');
        expect(fs.unlink).toHaveBeenCalledWith('/docs/avni_sqlite.db-shm');
        const backupCopy = fs.copyFile.mock.calls.findIndex(([from]) => from === '/docs/avni_sqlite.db');
        expect(close.mock.invocationCallOrder[0])
            .toBeLessThan(fs.copyFile.mock.invocationCallOrder[backupCopy]);
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

    // Reporting this one complete would commit SQLite as active while the runtime sits on
    // Realm, and the user's next sync is blocked with nothing having told them why.
    it('fails the restore when the snapshot is in place but SQLite will not open on it', async () => {
        const {service, onRestoreCompleted, onRestoreFailure, cb} = build();
        onRestoreCompleted.mockImplementationOnce(async () => false);

        await service.restore(cb);

        expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
        expect(onRestoreFailure).toHaveBeenCalled();
        expect(cb).toHaveBeenLastCalledWith(100, 'restoreFailed', true, expect.objectContaining({
            message: expect.stringContaining('could not be reopened'),
        }));
    });

    // Login waits on cb and has no catch on restore()'s promise.
    it('still reports the failure when the failure handler itself throws', async () => {
        const {service, onRestoreFailure, cb} = build();
        const diskFull = new Error('disk full');
        SqliteMigrationService.commitStateForUser.mockImplementationOnce(async () => { throw diskFull; });
        onRestoreFailure.mockImplementationOnce(async () => { throw new Error('realm reopen failed'); });

        await service.restore(cb);

        expect(cb).toHaveBeenLastCalledWith(100, 'restoreFailed', true, diskFull);
    });
});

describe('SQLite fast-sync backup uploads the live database', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobalContext.sqliteDb = {writeCopyTo: jest.fn()};
    });

    it('copies the live SQLite database and PUTs the zip to the signed url', async () => {
        const uploaded = [];
        const foregroundUpload = jest.fn(async () => {});
        const service = serviceWith({
            mediaQueueService: {
                getDumpUploadUrl: (dumpType) => {
                    uploaded.push(dumpType);
                    return Promise.resolve('https://s3/put');
                },
                foregroundUpload
            }
        });

        const messages = [];
        await service.backup(MediaQueueService.DumpType.CatchmentSqlite,
            (percent, message) => messages.push([percent, message]));

        const copiedTo = mockGlobalContext.sqliteDb.writeCopyTo.mock.calls[0][0].path;
        expect(copiedTo).toMatch(/\.db$/);
        expect(uploaded).toEqual([MediaQueueService.DumpType.CatchmentSqlite]);
        // Without this the upload step can be deleted and the suite stays green while the user is
        // told the upload succeeded.
        expect(foregroundUpload).toHaveBeenCalledTimes(1);
        expect(foregroundUpload).toHaveBeenCalledWith('https://s3/put', `${copiedTo}.zip`, expect.any(Function));
        expect(messages[messages.length - 1]).toEqual([100, 'backupCompleted']);
    });

    it('zips the copy before uploading it', async () => {
        const {zip} = require('react-native-zip-archive');
        const service = serviceWith();
        await service.backup(MediaQueueService.DumpType.CatchmentSqlite, () => {});
        const copiedTo = mockGlobalContext.sqliteDb.writeCopyTo.mock.calls[0][0].path;
        expect(zip).toHaveBeenCalledWith(copiedTo, `${copiedTo}.zip`);
    });

    it('removes both temp files on the success path', async () => {
        const fs = require('react-native-fs').default;
        const service = serviceWith();
        await service.backup(MediaQueueService.DumpType.CatchmentSqlite, () => {});
        const copiedTo = mockGlobalContext.sqliteDb.writeCopyTo.mock.calls[0][0].path;
        expect(fs.unlink).toHaveBeenCalledWith(copiedTo);
        expect(fs.unlink).toHaveBeenCalledWith(`${copiedTo}.zip`);
    });

    // A stalled PUT on a 400MB database leaves ~800MB of temp files behind per retry.
    it('removes both temp files when the upload fails', async () => {
        const fs = require('react-native-fs').default;
        const service = serviceWith({
            mediaQueueService: {foregroundUpload: jest.fn(async () => {throw new Error('PUT stalled');})}
        });
        const messages = [];
        await service.backup(MediaQueueService.DumpType.CatchmentSqlite,
            (percent, message) => messages.push([percent, message]));

        expect(messages[messages.length - 1]).toEqual([100, 'backupFailed']);
        // Pinned to the upload error: the cleanup assertions below are satisfied by the success
        // path too, so the failure has to be the one that leaves both temp files on disk.
        const General = require('../../src/utility/General').default;
        const loggedError = General.logError.mock.calls[General.logError.mock.calls.length - 1][1];
        expect(String(loggedError.message)).toMatch(/PUT stalled/);
        const copiedTo = mockGlobalContext.sqliteDb.writeCopyTo.mock.calls[0][0].path;
        expect(fs.unlink).toHaveBeenCalledWith(copiedTo);
        expect(fs.unlink).toHaveBeenCalledWith(`${copiedTo}.zip`);
    });

    it('reports backupFailed rather than throwing when the copy fails', async () => {
        mockGlobalContext.sqliteDb = {writeCopyTo: () => {throw new Error('disk full');}};
        const service = serviceWith();
        const messages = [];
        await service.backup(MediaQueueService.DumpType.CatchmentSqlite,
            (percent, message) => messages.push([percent, message]));
        expect(messages[messages.length - 1]).toEqual([100, 'backupFailed']);
    });

    it('refuses to upload when SQLite is not the open database', async () => {
        // A partly-failed backend switch would otherwise upload a Realm file under a SQLite key.
        mockGlobalContext.sqliteDb = null;
        const foregroundUpload = jest.fn(async () => {});
        const service = serviceWith({mediaQueueService: {foregroundUpload}});
        const messages = [];
        await service.backup(MediaQueueService.DumpType.CatchmentSqlite,
            (percent, message) => messages.push([percent, message]));
        expect(foregroundUpload).not.toHaveBeenCalled();
        expect(messages[messages.length - 1]).toEqual([100, 'backupFailed']);
        // Asserted on the message, not just the outcome: without the explicit guard the failure
        // is an opaque "Cannot read properties of null", which reports identically here.
        const General = require('../../src/utility/General').default;
        const loggedError = General.logError.mock.calls[General.logError.mock.calls.length - 1][1];
        expect(String(loggedError.message)).toMatch(/refusing to upload a fast sync dump/);
    });
});


describe('SQLite fast-sync restore handles identity by tier', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobalContext.sqliteDb = null;
        mockGet.mockImplementation(async (url) => url.endsWith('/exists') ? 'true' : 'https://signed-url');
    });

    // Shadows the backup helper above: these tests build a service for the restore path.
    function serviceWith({downloadTier, snapshotUsername, settingsUserId, userInfoService} = {}) {
        mockGetJSON.mockImplementation(async () => ({url: 'https://signed-url', tier: downloadTier}));
        const settings = {
            serverURL: 'https://server',
            userId: settingsUserId,
            idpType: 'cognito',
            clone() { return {...this}; },
        };
        const services = new Map([
            [SettingsService, {getSettings: jest.fn(() => settings), init: jest.fn(async () => {}), saveOrUpdate: jest.fn()}],
            [MediaService, {downloadFromUrl: jest.fn(async () => {})}],
            [EntitySyncStatusService, {setup: jest.fn()}],
            [UserInfoService, {getUserInfo: jest.fn(() => UserInfo.createEmptyInstance()), saveOrUpdate: jest.fn(), ...userInfoService}],
            ...noDirectlyAssignableSubjectTypes(),
        ]);
        const service = new BackupRestoreSqliteService({}, {getService: (cls) => services.get(cls)});
        service._readSnapshotUsername = jest.fn(async () => snapshotUsername);
        // Stands in for the reopen the runtime does inside this callback; the catchment cleanup
        // that follows it refuses to run without an open database.
        service.subscribeOnRestore(jest.fn(async () => {
            mockGlobalContext.sqliteDb = {
                close: jest.fn(),
                write: (callback) => callback(),
                deleteAllInSchema: jest.fn(),
                objects: () => ({filtered: () => ({slice: () => []})}),
                delete: jest.fn(),
            };
        }));
        service.subscribeOnRestoreFailure(jest.fn(async () => {}));
        return service;
    }

    it('rejects a per-user artifact whose username does not match', async () => {
        const service = serviceWith({
            downloadTier: 'perUser',
            snapshotUsername: 'someone.else',
            settingsUserId: 'aw@org'
        });
        const messages = [];
        await service.restore((p, m, failed) => messages.push([p, m, failed]));
        expect(messages[messages.length - 1].slice(0, 3)).toEqual([100, 'restoreFailed', true]);
    });

    it('rejects a snapshot artifact whose username does not match', async () => {
        const service = serviceWith({
            downloadTier: 'snapshot',
            snapshotUsername: 'someone.else',
            settingsUserId: 'aw@org'
        });
        const messages = [];
        await service.restore((p, m, failed) => messages.push([p, m, failed]));
        expect(messages[messages.length - 1].slice(0, 3)).toEqual([100, 'restoreFailed', true]);
    });

    it('accepts a catchment artifact uploaded by a peer and stamps the local identity', async () => {
        const saved = [];
        const service = serviceWith({
            downloadTier: 'catchment',
            snapshotUsername: 'peer.in.same.catchment',
            settingsUserId: 'aw@org',
            userInfoService: {saveOrUpdate: (entity) => saved.push(entity)}
        });
        const messages = [];
        await service.restore((p, m) => messages.push([p, m]));
        expect(messages[messages.length - 1]).toEqual([100, 'restoreComplete']);
        expect(saved).toHaveLength(1);
        expect(saved[0].username).toEqual('aw@org');
    });

    // The username matches deliberately: with a mismatched one this passes on the identity check
    // alone and stays green with the tier allow-list deleted. Only the unknown tier may fail it.
    it('fails closed when the download response carries no tier', async () => {
        const saved = [];
        const service = serviceWith({
            downloadTier: undefined,
            snapshotUsername: 'aw@org',
            settingsUserId: 'aw@org',
            userInfoService: {saveOrUpdate: (entity) => saved.push(entity)}
        });
        const messages = [];
        await service.restore((p, m, failed) => messages.push([p, m, failed]));
        expect(messages[messages.length - 1].slice(0, 3)).toEqual([100, 'restoreFailed', true]);
        expect(saved).toHaveLength(0);
    });

    it('asks the fast sync download routes, not the retired snapshot route', async () => {
        const service = serviceWith({
            downloadTier: 'perUser',
            snapshotUsername: 'aw@org',
            settingsUserId: 'aw@org'
        });
        await service.restore(() => {});
        expect(mockGet).toHaveBeenCalledWith('https://server/media/fastSyncDownload/exists');
        expect(mockGetJSON).toHaveBeenCalledWith('https://server/media/fastSyncDownload');
    });

    it('falls through to Realm when no fast sync database exists', async () => {
        mockGet.mockImplementation(async () => 'false');
        const service = serviceWith({
            downloadTier: 'perUser',
            snapshotUsername: 'aw@org',
            settingsUserId: 'aw@org'
        });
        const messages = [];
        await service.restore((p, m) => messages.push([p, m]));
        expect(messages[messages.length - 1]).toEqual([100, 'restoreNoSqliteDump']);
        expect(mockGetJSON).not.toHaveBeenCalled();
    });

    it('leaves a per-user restore without an identity stamp', async () => {
        const saved = [];
        const service = serviceWith({
            downloadTier: 'perUser',
            snapshotUsername: 'aw@org',
            settingsUserId: 'aw@org',
            userInfoService: {saveOrUpdate: (entity) => saved.push(entity)}
        });
        const messages = [];
        await service.restore((p, m) => messages.push([p, m]));
        expect(messages[messages.length - 1]).toEqual([100, 'restoreComplete']);
        expect(saved).toHaveLength(0);
    });

    // UserInfoService.getUserInfo() returns an empty instance, never null, so a dump with an empty
    // user_info table stamps organisation_name = NULL unless the undefined is caught.
    it('falls back to a placeholder organisation when the dump carries no user_info', async () => {
        const saved = [];
        const service = serviceWith({
            downloadTier: 'catchment',
            snapshotUsername: 'peer.in.same.catchment',
            settingsUserId: 'aw@org',
            userInfoService: {
                getUserInfo: () => UserInfo.createEmptyInstance(),
                saveOrUpdate: (entity) => saved.push(entity)
            }
        });
        await service.restore(() => {});
        expect(saved[0]).toMatchObject({username: 'aw@org', organisationName: 'dummy'});
    });

    it('keeps the existing organisation name when stamping the local identity', async () => {
        const saved = [];
        const service = serviceWith({
            downloadTier: 'catchment',
            snapshotUsername: 'peer.in.same.catchment',
            settingsUserId: 'aw@org',
            userInfoService: {
                getUserInfo: () => ({organisationName: 'Example Org'}),
                saveOrUpdate: (entity) => saved.push(entity)
            }
        });
        await service.restore(() => {});
        expect(saved[0]).toMatchObject({username: 'aw@org', name: 'aw@org', organisationName: 'Example Org'});
    });
});


describe('SQLite fast-sync restore clears a peer database of its owner (catchment only)', () => {
    const {MyGroups, UserSubjectAssignment, DraftSubject, DraftEncounter, DraftEnrolment, DraftProgramEncounter,
        IdentifierAssignment, EntitySyncStatus} = require('openchs-models');

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobalContext.sqliteDb = null;
        mockGet.mockImplementation(async (url) => url.endsWith('/exists') ? 'true' : 'https://signed-url');
    });

    function results(rows) {
        const proxy = {
            filtered: (query, arg) => {
                const [, field] = /^\s*(\w+)\s*=\s*\$0\s*$/.exec(query) || [];
                if (!field) throw new Error(`fake results proxy cannot parse: ${query}`);
                return results(rows.filter(r => r[field] === arg));
            },
            slice: () => [...rows],
        };
        return proxy;
    }

    function fakeSqliteDb(syncStatusRows) {
        const db = {
            clearedSchemas: [],
            deletedSyncStatuses: [],
            close: jest.fn(),
            write: jest.fn((callback) => callback()),
            deleteAllInSchema: jest.fn((schemaName) => db.clearedSchemas.push(schemaName)),
            objects: jest.fn((schemaName) => {
                if (schemaName !== EntitySyncStatus.schema.name) throw new Error(`unexpected objects(${schemaName})`);
                return results(syncStatusRows);
            }),
            delete: jest.fn((rows) => db.deletedSyncStatuses.push(...rows)),
        };
        return db;
    }

    function serviceWith({tier, syncStatusRows = []} = {}) {
        mockGetJSON.mockImplementation(async () => ({url: 'https://signed-url', tier}));
        const settings = {serverURL: 'https://server', userId: 'aw@org', idpType: 'cognito', clone() { return {...this}; }};
        const entitySyncStatusService = {setup: jest.fn()};
        const services = new Map([
            [SettingsService, {getSettings: jest.fn(() => settings), init: jest.fn(async () => {}), saveOrUpdate: jest.fn()}],
            [MediaService, {downloadFromUrl: jest.fn(async () => {})}],
            [EntitySyncStatusService, entitySyncStatusService],
            [UserInfoService, {getUserInfo: jest.fn(() => UserInfo.createEmptyInstance()), saveOrUpdate: jest.fn()}],
            ...noDirectlyAssignableSubjectTypes(),
        ]);
        const service = new BackupRestoreSqliteService({}, {getService: (cls) => services.get(cls)});
        service._readSnapshotUsername = jest.fn(async () => tier === 'catchment' ? 'peer.in.same.catchment' : 'aw@org');
        const sqliteDb = fakeSqliteDb(syncStatusRows);
        // The runtime reopens SQLite inside this callback; everything after it runs on the swapped file.
        service.subscribeOnRestore(jest.fn(async () => { mockGlobalContext.sqliteDb = sqliteDb; }));
        service.subscribeOnRestoreFailure(jest.fn(async () => {}));
        return {service, sqliteDb, entitySyncStatusService};
    }

    async function restore(service) {
        const messages = [];
        await service.restore((p, m, failed, error) => messages.push([p, m, failed, error]));
        return messages[messages.length - 1];
    }

    it("deletes the uploader's group memberships and subject assignments", async () => {
        const {service, sqliteDb} = serviceWith({tier: 'catchment'});

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.clearedSchemas).toEqual(expect.arrayContaining([
            MyGroups.schema.name, UserSubjectAssignment.schema.name]));
    });

    // Free identifiers are pre-allocated to the uploader's device. Left in place, this device hands
    // out numbers the uploader is still holding as free, and two subjects get the same identifier.
    it("deletes the uploader's pre-allocated identifier assignments", async () => {
        const {service, sqliteDb} = serviceWith({tier: 'catchment'});

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.clearedSchemas).toEqual(expect.arrayContaining([IdentifierAssignment.schema.name]));
    });

    it("deletes the uploader's unsaved drafts", async () => {
        const {service, sqliteDb} = serviceWith({tier: 'catchment'});

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.clearedSchemas).toEqual(expect.arrayContaining([
            DraftSubject.schema.name, DraftEncounter.schema.name,
            DraftEnrolment.schema.name, DraftProgramEncounter.schema.name]));
    });

    // The point of fast sync is the populated loaded_since rows; resetting them all would undo it.
    it('resets sync status for the cleared synced entities and for nothing else', async () => {
        const rows = [
            {uuid: 'g1', entityName: MyGroups.schema.name},
            {uuid: 'u1', entityName: UserSubjectAssignment.schema.name},
            {uuid: 'id1', entityName: IdentifierAssignment.schema.name},
            {uuid: 'ui1', entityName: UserInfo.schema.name},
            {uuid: 'i1', entityName: 'Individual'},
            {uuid: 'p1', entityName: 'ProgramEncounter'},
        ];
        const {service, sqliteDb} = serviceWith({tier: 'catchment', syncStatusRows: rows});

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.deletedSyncStatuses.map(r => r.uuid).sort()).toEqual(['g1', 'id1', 'u1', 'ui1']);
    });

    // setup() only inserts a REALLY_OLD_DATE row where none exists, so the stale rows must be gone first.
    it('drops the stale sync status rows before the baseline seed re-creates them', async () => {
        const rows = [{uuid: 'g1', entityName: MyGroups.schema.name}];
        const {service, sqliteDb, entitySyncStatusService} = serviceWith({tier: 'catchment', syncStatusRows: rows});

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.delete).toHaveBeenCalled();
        expect(entitySyncStatusService.setup).toHaveBeenCalled();
        expect(sqliteDb.delete.mock.invocationCallOrder[0])
            .toBeLessThan(entitySyncStatusService.setup.mock.invocationCallOrder[0]);
    });

    // The identity stamp rewrites the user_info row on purpose; only its checkpoint is the
    // uploader's. Kept, /v2/me is asked for changes since the uploader's last sync and never
    // returns this user's own record, so locale and preferences stay at their defaults.
    it('drops the user_info checkpoint but keeps the row the identity stamp rewrites', async () => {
        const rows = [{uuid: 'ui1', entityName: UserInfo.schema.name}];
        const {service, sqliteDb} = serviceWith({tier: 'catchment', syncStatusRows: rows});

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.deletedSyncStatuses.map(r => r.uuid)).toEqual(['ui1']);
        expect(sqliteDb.clearedSchemas).not.toContain(UserInfo.schema.name);
    });

    // The cleanup deletes on the promise that the seed re-creates. A silent seed failure leaves
    // the next sync destructuring loadedSince off undefined, which aborts the whole sync.
    it('fails the catchment restore when the baseline seed cannot re-create what it deleted', async () => {
        const rows = [{uuid: 'g1', entityName: MyGroups.schema.name}];
        const {service, entitySyncStatusService} = serviceWith({tier: 'catchment', syncStatusRows: rows});
        const seedFailed = new Error('entity_sync_status insert failed');
        entitySyncStatusService.setup.mockImplementation(() => { throw seedFailed; });

        const last = await restore(service);

        expect(last).toEqual([100, 'restoreFailed', true, seedFailed]);
        expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
    });

    it.each(['perUser', 'snapshot'])('completes a %s restore whose baseline seed fails — it deleted nothing', async (tier) => {
        const {service, entitySyncStatusService} = serviceWith({tier});
        entitySyncStatusService.setup.mockImplementation(() => { throw new Error('entity_sync_status insert failed'); });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
    });

    // The cleanup only deletes checkpoints; setup() is what puts them back. A schema it will not
    // re-seed would be deleted and never replaced, which is the crash the seed exists to prevent.
    it('only drops checkpoints the baseline seed will re-create', () => {
        const {EntityMetaData} = require('openchs-models');
        const reseeded = EntityMetaData.getEntitiesToBePulled()
            .filter(e => _.isEmpty(e.privilegeParam))
            .map(e => e.entityName);
        expect(_.difference(PEER_OWNED_SYNC_STATUS_SCHEMAS, reseeded)).toEqual([]);
    });

    // Running a peer's dump with their memberships and identifiers still in it is worse than
    // not restoring at all, so no proxy to clean it with has to fail the restore.
    it('fails the catchment restore when there is no database to clean the dump with', async () => {
        const {service} = serviceWith({tier: 'catchment'});
        service.subscribeOnRestore(jest.fn(async () => { mockGlobalContext.sqliteDb = null; }));

        const last = await restore(service);

        expect(last.slice(0, 3)).toEqual([100, 'restoreFailed', true]);
        expect(String(last[3].message)).toMatch(/refusing to run a catchment dump uncleaned/);
        expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
    });

    it.each(['perUser', 'snapshot'])('leaves a %s artifact alone — it holds no other user\'s rows', async (tier) => {
        const rows = [{uuid: 'g1', entityName: MyGroups.schema.name}];
        const {service, sqliteDb} = serviceWith({tier, syncStatusRows: rows});

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.deleteAllInSchema).not.toHaveBeenCalled();
        expect(sqliteDb.delete).not.toHaveBeenCalled();
    });
});


describe('SQLite fast-sync restore for a migration leg', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobalContext.sqliteDb = null;
        mockGet.mockImplementation(async (url) => url.endsWith('/exists') ? 'true' : 'https://signed-url');
        mockGetJSON.mockImplementation(async () => ({url: 'https://signed-url', tier: 'catchment'}));
    });

    // Shadows the helpers above: the migration runs on a target whose Settings row has not been
    // bootstrapped yet, so settingsUserId defaults to unset.
    function serviceWith({tier = 'catchment', snapshotUsername = 'peer.in.same.catchment', settingsUserId} = {}) {
        mockGetJSON.mockImplementation(async () => ({url: 'https://signed-url', tier}));
        const settings = {serverURL: 'https://server', userId: settingsUserId, clone() { return {...this}; }};
        const userInfoSaved = [];
        const entitySyncStatusService = {setup: jest.fn()};
        const services = new Map([
            [SettingsService, {getSettings: jest.fn(() => settings), init: jest.fn(async () => {}), saveOrUpdate: jest.fn()}],
            [MediaService, {downloadFromUrl: jest.fn(async () => {})}],
            [EntitySyncStatusService, entitySyncStatusService],
            [UserInfoService, {
                getUserInfo: jest.fn(() => UserInfo.createEmptyInstance()),
                saveOrUpdate: (entity) => userInfoSaved.push(entity),
            }],
            ...noDirectlyAssignableSubjectTypes(),
        ]);
        const service = new BackupRestoreSqliteService({}, {getService: (cls) => services.get(cls)});
        service._readSnapshotUsername = jest.fn(async () => snapshotUsername);
        const onRestoreCompleted = jest.fn(async () => {
            mockGlobalContext.sqliteDb = {
                close: jest.fn(),
                write: (callback) => callback(),
                deleteAllInSchema: jest.fn(),
                objects: () => ({filtered: () => ({slice: () => []})}),
                delete: jest.fn(),
            };
        });
        const onRestoreFailure = jest.fn(async () => {});
        service.subscribeOnRestore(onRestoreCompleted);
        service.subscribeOnRestoreFailure(onRestoreFailure);
        return {service, onRestoreCompleted, onRestoreFailure, userInfoSaved, entitySyncStatusService};
    }

    it('applies the dump and reports it applied', async () => {
        const {service, onRestoreCompleted, entitySyncStatusService} = serviceWith();

        await expect(service.restoreForMigration('aw@org')).resolves.toBe(true);

        expect(require('react-native-zip-archive').unzip).toHaveBeenCalled();
        expect(onRestoreCompleted).toHaveBeenCalled();
        expect(entitySyncStatusService.setup).toHaveBeenCalled();
    });

    // commitLeg is the single writer of activeBackend for a leg; a commit here would also clear
    // preparedTarget and lose the marker that stops the next attempt downloading the dump again.
    it('does not commit the backend state — the leg does that', async () => {
        const {service} = serviceWith();

        await service.restoreForMigration('aw@org');

        expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
        expect(SqliteMigrationService.persistStateForUser).not.toHaveBeenCalled();
    });

    // The leg has already moved the runtime to SQLite, whose Settings row is still the default
    // one; the username the leg resolved on the source is the only one that names this user.
    it('stamps the identity from the username the leg resolved, not the target Settings', async () => {
        const {service, userInfoSaved} = serviceWith({settingsUserId: undefined});

        await expect(service.restoreForMigration('aw@org')).resolves.toBe(true);

        expect(userInfoSaved).toHaveLength(1);
        expect(userInfoSaved[0].username).toEqual('aw@org');
    });

    it('reports no dump applied when the catchment has none, without downloading', async () => {
        mockGet.mockImplementation(async () => 'false');
        const {service, onRestoreCompleted} = serviceWith();

        await expect(service.restoreForMigration('aw@org')).resolves.toBe(false);

        expect(mockGetJSON).not.toHaveBeenCalled();
        expect(onRestoreCompleted).not.toHaveBeenCalled();
    });

    it.each(['perUser', 'snapshot'])('still rejects a %s artifact generated for someone else', async (tier) => {
        const {service, userInfoSaved} = serviceWith({tier, snapshotUsername: 'someone.else'});

        await expect(service.restoreForMigration('aw@org')).resolves.toBe(false);

        expect(userInfoSaved).toHaveLength(0);
        expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
    });

    // onRestoreFailure hands the runtime back to the committed backend, which mid-leg is the
    // source the migration is leaving; the target's clear-and-seed fallback would then wipe it.
    it('does not hand the runtime back to the committed backend when the dump is unusable', async () => {
        const {service, onRestoreFailure} = serviceWith({tier: 'perUser', snapshotUsername: 'someone.else'});

        await service.restoreForMigration('aw@org');

        expect(onRestoreFailure).not.toHaveBeenCalled();
    });

    // A failure this late has already swapped the file away and closed the connection; the beans
    // hold a dead handle until something reopens the rolled-back database.
    it('reopens the rolled-back database when the swap succeeds but the reopen does not', async () => {
        const fs = require('react-native-fs').default;
        const {service, onRestoreCompleted, onRestoreFailure} = serviceWith();
        onRestoreCompleted.mockImplementationOnce(async () => false);

        await expect(service.restoreForMigration('aw@org')).resolves.toBe(false);

        expect(fs.moveFile).toHaveBeenCalledWith('/docs/avni_sqlite.db.backup', '/docs/avni_sqlite.db');
        expect(onRestoreCompleted).toHaveBeenCalledTimes(2);
        expect(onRestoreFailure).not.toHaveBeenCalled();
    });

    it('does not reopen anything when the failure came before the file swap', async () => {
        const {service, onRestoreCompleted} = serviceWith({tier: 'perUser', snapshotUsername: 'someone.else'});

        await service.restoreForMigration('aw@org');

        expect(onRestoreCompleted).not.toHaveBeenCalled();
    });
});


describe('SQLite fast-sync restore clears a peer\'s directly assigned caseload (catchment only)', () => {
    const {EntitySyncStatus} = require('openchs-models');

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobalContext.sqliteDb = null;
        mockGet.mockImplementation(async (url) => url.endsWith('/exists') ? 'true' : 'https://signed-url');
    });

    const asResults = (rows) => ({map: (fn) => rows.map(fn)});

    function checkpointResults(rows) {
        return {
            filtered(query, arg) {
                const [, field] = /^\s*(\w+)\s*=\s*\$0\s*$/.exec(query) || [];
                if (!field) throw new Error(`fake checkpoint query not understood: ${query}`);
                return checkpointResults(rows.filter(r => r[field] === arg));
            },
            map: (fn) => rows.map(fn),
        };
    }

    const profileFormMapping = (subjectTypeUuid) => ({
        getEntityNameAndEntityTypeUUID: () => ({entityName: 'Individual', entityTypeUuid: subjectTypeUuid}),
    });

    function serviceWith({tier, directlyAssignable = [], subjectsByType = {}, formMappingsByType = {},
        checkpointRows = []} = {}) {
        mockGetJSON.mockImplementation(async () => ({url: 'https://signed-url', tier}));
        const settings = {serverURL: 'https://server', userId: 'aw@org', idpType: 'cognito', clone() { return {...this}; }};
        const removedSubjects = [];
        const resetCheckpoints = [];
        const entitySyncStatusService = {
            setup: jest.fn(),
            findAll: jest.fn(() => checkpointResults(checkpointRows)),
            updateAsPerSyncDetails: jest.fn((rows) => resetCheckpoints.push(...rows)),
        };
        const writeDepthAtRemoval = [];
        const subjectMigrationService = {
            removeEntitiesFor: jest.fn(({subjectUUID}) => {
                removedSubjects.push(subjectUUID);
                writeDepthAtRemoval.push(sqliteDb.openWrites);
            }),
        };
        const services = new Map([
            [SettingsService, {getSettings: jest.fn(() => settings), init: jest.fn(async () => {}), saveOrUpdate: jest.fn()}],
            [MediaService, {downloadFromUrl: jest.fn(async () => {})}],
            [EntitySyncStatusService, entitySyncStatusService],
            [UserInfoService, {getUserInfo: jest.fn(() => UserInfo.createEmptyInstance()), saveOrUpdate: jest.fn()}],
            [SubjectTypeService, {
                getAllDirectlyAssignable: jest.fn(() => directlyAssignable),
                getAll: jest.fn(() => Object.keys(subjectsByType).map(uuid => ({uuid}))),
            }],
            [IndividualService, {getAllBySubjectType: jest.fn((st) => asResults(subjectsByType[st.uuid] || []))}],
            [SubjectMigrationService, subjectMigrationService],
            [FormMappingService, {getFormMappingsForSubjectType: jest.fn((st) => asResults(formMappingsByType[st.uuid] || []))}],
        ]);
        const service = new BackupRestoreSqliteService({}, {getService: (cls) => services.get(cls)});
        service._readSnapshotUsername = jest.fn(async () => tier === 'catchment' ? 'peer.in.same.catchment' : 'aw@org');
        const sqliteDb = {
            close: jest.fn(),
            openWrites: 0,
            write: jest.fn((callback) => {
                sqliteDb.openWrites++;
                try { return callback(); } finally { sqliteDb.openWrites--; }
            }),
            deleteAllInSchema: jest.fn(),
            objects: jest.fn(() => ({filtered: () => ({slice: () => []})})),
            delete: jest.fn(),
        };
        service.subscribeOnRestore(jest.fn(async () => { mockGlobalContext.sqliteDb = sqliteDb; }));
        service.subscribeOnRestoreFailure(jest.fn(async () => {}));
        return {service, sqliteDb, entitySyncStatusService, subjectMigrationService, removedSubjects,
            resetCheckpoints, writeDepthAtRemoval};
    }

    async function restore(service) {
        const messages = [];
        await service.restore((p, m, failed, error) => messages.push([p, m, failed, error]));
        return messages[messages.length - 1];
    }

    const assignable = {uuid: 'st-assignable'};
    const openType = {uuid: 'st-open'};

    // Subjects of a directly assignable type are assigned to named workers, so the uploader's are
    // not this user's to keep.
    it('removes the uploader\'s subjects of a directly assignable type', async () => {
        const {service, removedSubjects} = serviceWith({
            tier: 'catchment',
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}, {uuid: 'sub-2'}]},
        });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(removedSubjects).toEqual(['sub-1', 'sub-2']);
    });

    // Subjects of an openly-visible type are the same for everyone in the catchment, and re-pulling
    // them is exactly the sync the dump exists to avoid.
    it('keeps the subjects of a type that is not directly assignable', async () => {
        const {service, removedSubjects} = serviceWith({
            tier: 'catchment',
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}], 'st-open': [{uuid: 'sub-open'}]},
        });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(removedSubjects).not.toContain('sub-open');
    });

    it('puts the deleted type\'s checkpoints back to the beginning of time', async () => {
        const {service, resetCheckpoints} = serviceWith({
            tier: 'catchment',
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}]},
            formMappingsByType: {'st-assignable': [profileFormMapping('st-assignable')]},
            checkpointRows: [
                {uuid: 'cp-ind', entityName: 'Individual', entityTypeUuid: 'st-assignable'},
                {uuid: 'cp-open', entityName: 'Individual', entityTypeUuid: 'st-open'},
            ],
        });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(resetCheckpoints).toEqual([{
            uuid: 'cp-ind',
            entityName: 'Individual',
            entityTypeUuid: 'st-assignable',
            loadedSince: EntitySyncStatus.REALLY_OLD_DATE,
        }]);
    });

    // The baseline seed only inserts where no row exists, and Individual is privilege-scoped so it
    // is not one of the rows that seed would put back. Rewritten in place, there is nothing to
    // put back and nothing for the seed to undo.
    it('rewrites the checkpoint rather than deleting it, and does so before the baseline seed', async () => {
        const {service, sqliteDb, entitySyncStatusService} = serviceWith({
            tier: 'catchment',
            directlyAssignable: [assignable],
            formMappingsByType: {'st-assignable': [profileFormMapping('st-assignable')]},
            checkpointRows: [{uuid: 'cp-ind', entityName: 'Individual', entityTypeUuid: 'st-assignable'}],
        });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(sqliteDb.delete).not.toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({uuid: 'cp-ind'})]));
        expect(entitySyncStatusService.updateAsPerSyncDetails.mock.invocationCallOrder[0])
            .toBeLessThan(entitySyncStatusService.setup.mock.invocationCallOrder[0]);
    });

    // Half-applied, the device keeps some of the uploader's subjects against checkpoints that say
    // they were already pulled, and nothing afterwards notices.
    it('removes the caseload inside a single SQLite write', async () => {
        const {service, writeDepthAtRemoval} = serviceWith({
            tier: 'catchment',
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}, {uuid: 'sub-2'}]},
        });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(writeDepthAtRemoval).toEqual([1, 1]);
    });

    it.each(['perUser', 'snapshot'])('leaves a %s artifact\'s subjects alone — it is this user\'s own', async (tier) => {
        const {service, removedSubjects, resetCheckpoints} = serviceWith({
            tier,
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}]},
            formMappingsByType: {'st-assignable': [profileFormMapping('st-assignable')]},
            checkpointRows: [{uuid: 'cp-ind', entityName: 'Individual', entityTypeUuid: 'st-assignable'}],
        });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(removedSubjects).toEqual([]);
        expect(resetCheckpoints).toEqual([]);
    });

    // Running a peer's dump with their caseload still in it is worse than not restoring at all,
    // so no database to clean it with has to fail the restore.
    it('refuses to run when there is no open SQLite database', () => {
        const {service} = serviceWith({tier: 'catchment', directlyAssignable: [assignable]});
        mockGlobalContext.sqliteDb = null;

        expect(() => service._clearDirectlyAssignedSubjects())
            .toThrow(/refusing to run a catchment dump uncleaned/);
    });

    it('fails the catchment restore when the caseload cannot be removed', async () => {
        const {service, subjectMigrationService} = serviceWith({
            tier: 'catchment',
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}]},
        });
        const deleteFailed = new Error('subject delete failed');
        subjectMigrationService.removeEntitiesFor.mockImplementation(() => { throw deleteFailed; });

        const last = await restore(service);

        expect(last).toEqual([100, 'restoreFailed', true, deleteFailed]);
        expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
    });
});
