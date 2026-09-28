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
const SqliteMigrationService = require('../../src/service/SqliteMigrationService').default;
const MediaQueueService = require('../../src/service/MediaQueueService').default;
const _ = require('lodash');
const {UserInfo} = require('openchs-models');
const {
    PEER_OWNED_SYNC_STATUS_SCHEMAS,
    STALE_SYNC_STATUS_SCHEMAS,
} = require('../../src/service/BackupRestoreSqliteService');

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
    ]);
    const service = new BackupRestoreSqliteService({}, {getService: (cls) => services.get(cls)});
    service._readSnapshotUsername = jest.fn(async () => 'test-user');
    const sqliteDb = {
        close: jest.fn(),
        write: (callback) => callback(),
        deleteAllInSchema: jest.fn(),
        objects: () => ({filtered: () => ({slice: () => []})}),
        delete: jest.fn(),
    };
    const observed = {};
    // Stands in for the reopen the runtime does inside this callback; the cleanup that follows it
    // refuses to run without an open database.
    const onRestoreCompleted = jest.fn(async () => {
        observed.sqliteDbAtReopen = mockGlobalContext.sqliteDb;
        mockGlobalContext.sqliteDb = sqliteDb;
    });
    const onRestoreFailure = jest.fn(async () => {});
    service.subscribeOnRestore(onRestoreCompleted);
    service.subscribeOnRestoreFailure(onRestoreFailure);
    return {service, settingsService, onRestoreCompleted, onRestoreFailure, cb: jest.fn(), sqliteDb, observed};
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
        const {service, cb, observed} = build();

        await service.restore(cb);

        expect(close).toHaveBeenCalled();
        expect(observed.sqliteDbAtReopen).toBeNull();
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


describe('SQLite fast-sync restore clears what the dump must not carry forward', () => {
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

    // Free identifiers are pre-allocated to the device the dump came from, and that pool has moved
    // on since the upload: identifiers used and pushed afterwards come back marked free. The server
    // only ever re-sends *unused* identifiers, so nothing later flips them, and this device hands
    // out numbers already spent — two subjects end up with the same identifier. True of a per-user
    // dump and of a snapshot as much as of a peer's, so every tier drops the pool.
    it.each(['catchment', 'perUser', 'snapshot'])(
        "deletes the pre-allocated identifier pool from a %s dump", async (tier) => {
            const {service, sqliteDb} = serviceWith({tier});

            const last = await restore(service);

            expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
            expect(sqliteDb.clearedSchemas).toEqual(expect.arrayContaining([IdentifierAssignment.schema.name]));
        });

    // The identifier pool is stale, not foreign. Groups, subject assignments and drafts in a
    // per-user dump or a snapshot are this user's own, so deleting them would lose real work and
    // silently drop the caseload the device is meant to come back with.
    it.each(['perUser', 'snapshot'])(
        "clears nothing but the identifier pool from a %s dump", async (tier) => {
            const {service, sqliteDb} = serviceWith({tier});

            const last = await restore(service);

            expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
            expect(sqliteDb.clearedSchemas).toEqual([IdentifierAssignment.schema.name]);
        });

    // Deleting the rows without their checkpoint leaves loaded_since at the uploader's last sync,
    // and the server re-sends only identifiers newer than it — the device is left with no pool at
    // all and cannot register anyone.
    it.each(['perUser', 'snapshot'])(
        "drops the identifier checkpoint and no other from a %s dump", async (tier) => {
            const rows = [
                {uuid: 'id1', entityName: IdentifierAssignment.schema.name},
                {uuid: 'g1', entityName: MyGroups.schema.name},
                {uuid: 'u1', entityName: UserSubjectAssignment.schema.name},
                {uuid: 'ui1', entityName: UserInfo.schema.name},
                {uuid: 'i1', entityName: 'Individual'},
            ];
            const {service, sqliteDb} = serviceWith({tier, syncStatusRows: rows});

            const last = await restore(service);

            expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
            expect(sqliteDb.deletedSyncStatuses.map(r => r.uuid)).toEqual(['id1']);
        });

    // setup() only inserts a baseline row where none exists, so the stale identifier checkpoint has
    // to be gone by the time it runs. Asserted on the identifier deletes themselves rather than on
    // db.write, which the catchment cleanup would also open.
    it.each(['catchment', 'perUser', 'snapshot'])(
        'clears the identifier pool and its checkpoint before the baseline seed in a %s restore', async (tier) => {
            const rows = [{uuid: 'id1', entityName: IdentifierAssignment.schema.name}];
            const {service, sqliteDb, entitySyncStatusService} = serviceWith({tier, syncStatusRows: rows});

            const last = await restore(service);

            expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
            const seededAt = entitySyncStatusService.setup.mock.invocationCallOrder[0];
            expect(seededAt).toBeDefined();
            const identifierRowClear = sqliteDb.deleteAllInSchema.mock.calls
                .findIndex(([schemaName]) => schemaName === IdentifierAssignment.schema.name);
            expect(identifierRowClear).toBeGreaterThanOrEqual(0);
            expect(sqliteDb.deleteAllInSchema.mock.invocationCallOrder[identifierRowClear])
                .toBeLessThan(seededAt);
            const checkpointDelete = sqliteDb.delete.mock.calls
                .findIndex(([deleted]) => _.some(deleted, r => r.uuid === 'id1'));
            expect(checkpointDelete).toBeGreaterThanOrEqual(0);
            expect(sqliteDb.delete.mock.invocationCallOrder[checkpointDelete]).toBeLessThan(seededAt);
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

    // The cleanup deletes on the promise that the seed re-creates. A silent seed failure leaves the
    // next sync destructuring loadedSince off undefined, which aborts the whole sync — and now that
    // every tier drops the identifier checkpoint, every tier has that promise to keep.
    it.each(['catchment', 'perUser', 'snapshot'])(
        'fails a %s restore when the baseline seed cannot re-create what it deleted', async (tier) => {
            const rows = [{uuid: 'id1', entityName: IdentifierAssignment.schema.name}];
            const {service, entitySyncStatusService} = serviceWith({tier, syncStatusRows: rows});
            const seedFailed = new Error('entity_sync_status insert failed');
            entitySyncStatusService.setup.mockImplementation(() => { throw seedFailed; });

            const last = await restore(service);

            expect(last).toEqual([100, 'restoreFailed', true, seedFailed]);
            expect(SqliteMigrationService.commitStateForUser).not.toHaveBeenCalled();
        });

    // The cleanup only deletes checkpoints; setup() is what puts them back. A schema it will not
    // re-seed would be deleted and never replaced, which is the crash the seed exists to prevent.
    it('only drops checkpoints the baseline seed will re-create', () => {
        const {EntityMetaData} = require('openchs-models');
        const reseeded = EntityMetaData.getEntitiesToBePulled()
            .filter(e => _.isEmpty(e.privilegeParam))
            .map(e => e.entityName);
        const dropped = [...PEER_OWNED_SYNC_STATUS_SCHEMAS, ...STALE_SYNC_STATUS_SCHEMAS];
        expect(dropped).toContain(IdentifierAssignment.schema.name);
        expect(_.difference(dropped, reseeded)).toEqual([]);
    });

    it.each(['perUser', 'snapshot'])(
        "keeps a %s artifact's own group memberships, assignments and their checkpoints", async (tier) => {
            const rows = [
                {uuid: 'g1', entityName: MyGroups.schema.name},
                {uuid: 'u1', entityName: UserSubjectAssignment.schema.name},
            ];
            const {service, sqliteDb} = serviceWith({tier, syncStatusRows: rows});

            const last = await restore(service);

            expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
            expect(sqliteDb.clearedSchemas).not.toContain(MyGroups.schema.name);
            expect(sqliteDb.clearedSchemas).not.toContain(UserSubjectAssignment.schema.name);
            expect(sqliteDb.clearedSchemas).not.toContain(DraftSubject.schema.name);
            expect(sqliteDb.clearedSchemas).not.toContain(DraftEncounter.schema.name);
            expect(sqliteDb.clearedSchemas).not.toContain(DraftEnrolment.schema.name);
            expect(sqliteDb.clearedSchemas).not.toContain(DraftProgramEncounter.schema.name);
            expect(sqliteDb.deletedSyncStatuses).toEqual([]);
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
