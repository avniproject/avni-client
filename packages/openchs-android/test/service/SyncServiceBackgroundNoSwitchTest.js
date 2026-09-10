/**
 * #2118 — the Realm→SQLite switch runs only inside a sync the user started.
 *
 * A background full sync (the twelve-hour download) reaches the same mid-sync
 * migration check as a manual sync and cannot otherwise tell the two apart. With
 * no screen, no progress and a ten-minute ceiling imposed by the phone, a switch
 * started there is usually cut off and leaves a half-filled database. So the check
 * declines and completes as a normal sync on the current backend; the next manual
 * sync does the switch.
 *
 * Run: npx jest test/service/SyncServiceBackgroundNoSwitchTest.js --selectProjects unit --verbose
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

const mockGlobalContext = {
    switchBackend: jest.fn(),
    getActiveBackend: jest.fn(() => 'realm'),
    // The @Service decorator registers every service against this at import time.
    beanRegistry: {register: jest.fn()},
};
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));

const SyncService = require('../../src/service/SyncService').default;
const General = require('../../src/utility/General').default;

const migrationService = {
    computeDesiredBackend: jest.fn(() => 'sqlite'),
    _captureAuthState: jest.fn(() => ({idpType: 'keycloak'})),
    getState: jest.fn(async () => ({phase: 'idle'})),
    persistState: jest.fn(async () => {}),
    _bootstrapTargetSettings: jest.fn(async () => {}),
    _resetTargetBackend: jest.fn(),
};

/** A service that is due to switch: desired sqlite, active realm, empty outbox. */
function buildSwitchCandidate() {
    const svc = Object.create(SyncService.prototype);
    svc.entityQueueService = {
        getPendingFieldDataCount: jest.fn(() => 0),
        getPendingFieldDataSummary: jest.fn(() => ''),
    };
    svc.getService = jest.fn((name) => name === 'sqliteMigrationService' ? migrationService : undefined);
    return svc;
}

describe('_checkAndSwitchBackendMidSync — manual sync only', () => {
    beforeEach(() => {
        mockGlobalContext.switchBackend.mockClear();
        mockGlobalContext.getActiveBackend.mockReturnValue('realm');
        migrationService.persistState.mockClear();
        migrationService._resetTargetBackend.mockClear();
        General.logInfo.mockClear();
    });

    it('declines to switch on a background sync', async () => {
        const svc = buildSwitchCandidate();

        const switched = await svc._checkAndSwitchBackendMidSync(() => {}, false);

        expect(switched).toBe(false);
        expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
        expect(migrationService.persistState).not.toHaveBeenCalled();
        expect(migrationService._resetTargetBackend).not.toHaveBeenCalled();
    });

    it('leaves one log line saying the switch is waiting for a manual sync', async () => {
        const svc = buildSwitchCandidate();

        await svc._checkAndSwitchBackendMidSync(() => {}, false);

        const deferralLines = General.logInfo.mock.calls
            .filter(([, message]) => /background sync; deferring to the next manual sync/.test(message));
        expect(deferralLines).toHaveLength(1);
    });

    it('does not show the switching message on a background sync', async () => {
        const svc = buildSwitchCandidate();
        const statusMessageCallBack = jest.fn();

        await svc._checkAndSwitchBackendMidSync(statusMessageCallBack, false);

        expect(statusMessageCallBack).not.toHaveBeenCalled();
    });

    it('switches on a manual sync under the same state', async () => {
        const svc = buildSwitchCandidate();

        const switched = await svc._checkAndSwitchBackendMidSync(() => {}, true);

        expect(switched).toBe(true);
        expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith('sqlite');
    });

    it('threads the flag from _switchBackendAndResyncRefDataIfNeeded', async () => {
        const svc = buildSwitchCandidate();
        svc._checkAndSwitchBackendMidSync = jest.fn(async () => false);

        const result = await svc._switchBackendAndResyncRefDataIfNeeded(() => {}, () => {}, [], false);

        expect(result).toBeNull();
        expect(svc._checkAndSwitchBackendMidSync).toHaveBeenCalledWith(expect.any(Function), false);
    });
});

// MyGroups is the entity the migration decision reads; the rest stand in for the bulk
// reference dataset. Shapes copied from SyncServiceRefDataDoublePullTest, which drives
// the same method.
const REFERENCE_ENTITIES = ['MyGroups', 'Concept', 'ConceptAnswer', 'FormElement', 'Groups'];
const BULK_REFERENCE = REFERENCE_ENTITIES.filter(n => n !== 'MyGroups');

const ALL_ENTITIES_META_DATA = [
    ...REFERENCE_ENTITIES.map(entityName => ({entityName, type: 'reference'})),
    {entityName: 'ProgramEnrolment', type: 'tx'},
    {entityName: 'Encounter', type: 'tx'},
    {entityName: 'UserInfo', type: 'tx'},
    {entityName: 'ResetSync', type: 'tx'},
    {entityName: 'SubjectMigration', type: 'tx'},
];

const SYNC_DETAILS = ALL_ENTITIES_META_DATA
    .filter(({entityName}) => !['ResetSync', 'SubjectMigration'].includes(entityName))
    .map(({entityName}) => ({entityName, entityTypeUuid: `${entityName}-uuid`, loadedSince: '2024-12-03T11:44:51.008Z'}));

/**
 * A full sync whose user is in the migration group and whose device is still on Realm,
 * with the REAL _switchBackendAndResyncRefDataIfNeeded and _checkAndSwitchBackendMidSync
 * in place — so the sync source is what decides whether the switch happens.
 */
function buildMigrationDueSyncService() {
    const svc = Object.create(SyncService.prototype);
    const noop = () => {};
    const resolved = () => Promise.resolve();

    svc.entitySyncStatusService = {
        updateAsPerSyncDetails: jest.fn(),
        removeRevokedPrivileges: jest.fn((_meta, syncDetails) => syncDetails),
        setup: jest.fn(),
    };
    svc.entityQueueService = {
        getPendingFieldDataCount: jest.fn(() => 0),
        getPendingFieldDataSummary: jest.fn(() => ''),
    };

    svc.pushData = jest.fn(resolved);
    svc.getResetSyncData = jest.fn(resolved);
    svc.getRefData = jest.fn(resolved);
    svc.getTxData = jest.fn(resolved);
    svc.getSyncDetails = jest.fn(async () => ({
        syncDetails: SYNC_DETAILS, endDateTime: 'end', now: 'now',
    }));
    svc.updateAsPerNewPrivilege = jest.fn((_all, _ups, syncDetails) => syncDetails);
    svc._catchUpTxDataAfterMigration = jest.fn(resolved);

    svc._disableForeignKeysIfSqlite = noop;
    svc._enableForeignKeysIfSqlite = noop;
    svc._enableShallowHydrationIfSqlite = noop;
    svc._disableShallowHydrationIfSqlite = noop;
    svc._checkForeignKeyIntegrityIfSqlite = noop;
    svc._buildReferenceCacheIfSqlite = jest.fn(resolved);
    svc._finalizeMigrationState = jest.fn(resolved);
    svc.downloadNewsImages = jest.fn(resolved);
    svc.downloadExtensions = jest.fn(resolved);
    svc.downloadCustomCardHtmlFiles = jest.fn(resolved);
    svc.downloadFormShareTemplates = jest.fn(resolved);
    svc.downloadIcons = jest.fn(resolved);
    svc.downloadContent = jest.fn(resolved);

    svc.getService = jest.fn((arg) => arg === 'sqliteMigrationService' ? migrationService : ({
        isResetSyncRequired: () => false,
        encryptOrDecryptDbIfRequired: resolved,
        migrateSubjects: resolved,
        markAllResetSyncsMigrated: jest.fn(),
    }));

    return svc;
}

/** Every reference entity dataServerSync asked getRefData to pull, in order. */
const refPulled = (svc) => svc.getRefData.mock.calls
    .flatMap(([entitiesMetadata]) => entitiesMetadata.map(e => e.entityName));

describe('a background full sync finishes on the current backend', () => {
    beforeEach(() => {
        mockGlobalContext.switchBackend.mockClear();
        mockGlobalContext.getActiveBackend.mockReturnValue('realm');
        migrationService.persistState.mockClear();
        migrationService._resetTargetBackend.mockClear();
    });

    it('does not switch, and still pulls the bulk reference data on the backend it is already on', async () => {
        const svc = buildMigrationDueSyncService();
        const noop = () => {};

        await svc.dataServerSync(
            ALL_ENTITIES_META_DATA,
            noop, noop, noop, noop,
            false,      // isManualSync — this is the twelve-hour background download
            undefined,  // userConfirmation
            false,      // isOnlyUploadRequired
        );

        // The switch is due, and did not happen.
        expect(migrationService.computeDesiredBackend).toHaveBeenCalled();
        expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
        expect(migrationService._resetTargetBackend).not.toHaveBeenCalled();

        // The sync completed as a normal sync: MyGroups first, then the deferred bulk,
        // each exactly once, on Realm.
        expect(refPulled(svc)).toEqual(['MyGroups', ...BULK_REFERENCE]);
    });

    it('switches when the very same sync is one the user started', async () => {
        const svc = buildMigrationDueSyncService();
        const noop = () => {};

        await svc.dataServerSync(
            ALL_ENTITIES_META_DATA,
            noop, noop, noop, noop,
            true,       // isManualSync
            undefined,
            false,
        );

        expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith('sqlite');
    });
});
