/**
 * The backend substitution in onBackupDump is the single point that makes fast sync reachable on
 * SQLite. Without a test here, reverting it leaves the whole suite green while SQLite devices
 * silently attempt a Realm backup.
 */

let mockGlobalContext;

jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {logDebug: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn()},
}));
jest.mock('../../src/service/BackupRestoreRealmService', () => ({__esModule: true, default: class BackupRestoreRealmService {}}));
jest.mock('../../src/service/BackupRestoreSqliteService', () => ({__esModule: true, default: class BackupRestoreSqliteService {}}));
jest.mock('../../src/service/AppInfoUploadService', () => ({__esModule: true, default: class AppInfoUploadService {}}));
jest.mock('../../src/service/UserInfoService', () => ({__esModule: true, default: class UserInfoService {}}));
jest.mock('../../src/service/SettingsService', () => ({__esModule: true, default: class SettingsService {}}));
jest.mock('../../src/service/RuleEvaluationService', () => ({__esModule: true, default: class RuleEvaluationService {}}));
jest.mock('../../src/service/AnonymizeRealmService', () => ({__esModule: true, default: class AnonymizeRealmService {}}));
jest.mock('../../src/service/application/MenuItemService', () => ({__esModule: true, default: class MenuItemService {}}));
// The real module reaches IndividualService and the rest of the sync stack; onBackupDump only
// needs the DumpType constants, which are mirrored here from the source.
jest.mock('../../src/service/MediaQueueService', () => ({
    __esModule: true,
    default: {DumpType: {Catchment: 'catchment', CatchmentSqlite: 'catchmentSqlite', Adhoc: 'Adhoc'}},
}));

const {MenuActions} = require('../../src/action/MenuActions');
const MediaQueueService = require('../../src/service/MediaQueueService').default;
const BackupRestoreRealmService = require('../../src/service/BackupRestoreRealmService').default;
const BackupRestoreSqliteService = require('../../src/service/BackupRestoreSqliteService').default;
const AppInfoUploadService = require('../../src/service/AppInfoUploadService').default;
const {BACKENDS} = require('../../src/framework/BackendTypes');

function dispatch(backend, dumpType) {
    mockGlobalContext = {getActiveBackend: () => backend};
    const calls = [];
    const context = {
        get: (serviceType) => ({
            backup: (type) => calls.push([serviceType, type]),
            upload: () => calls.push([serviceType, 'upload']),
        })
    };
    MenuActions.onBackupDump({}, {dumpType, onBackupDumpCb: () => {}}, context);
    return calls;
}

describe('MenuActions.onBackupDump', () => {
    it('backs up through the SQLite service on the SQLite backend', () => {
        expect(dispatch(BACKENDS.SQLITE, MediaQueueService.DumpType.Catchment))
            .toEqual([[BackupRestoreSqliteService, MediaQueueService.DumpType.CatchmentSqlite]]);
    });

    it('backs up through the Realm service on the Realm backend', () => {
        expect(dispatch(BACKENDS.REALM, MediaQueueService.DumpType.Catchment))
            .toEqual([[BackupRestoreRealmService, MediaQueueService.DumpType.Catchment]]);
    });

    // MenuView.showBackupFailedAlert renders its body from the third argument; dropping it leaves
    // the user with an empty dialog.
    it('forwards the avniError from the service to the callback', () => {
        mockGlobalContext = {getActiveBackend: () => BACKENDS.SQLITE};
        const avniError = {messageKey: 'backupFailed', reportingText: 'S3 responded 403'};
        const context = {get: () => ({backup: (type, cb) => cb(100, 'backupFailed', avniError)})};
        const received = [];

        MenuActions.onBackupDump({}, {
            dumpType: MediaQueueService.DumpType.Catchment,
            onBackupDumpCb: (...args) => received.push(args)
        }, context);

        expect(received).toEqual([[100, 'backupFailed', avniError]]);
    });

    it('sends an adhoc dump to the app info uploader on either backend', () => {
        expect(dispatch(BACKENDS.SQLITE, MediaQueueService.DumpType.Adhoc))
            .toEqual([[AppInfoUploadService, 'upload']]);
        expect(dispatch(BACKENDS.REALM, MediaQueueService.DumpType.Adhoc))
            .toEqual([[AppInfoUploadService, 'upload']]);
    });
});
