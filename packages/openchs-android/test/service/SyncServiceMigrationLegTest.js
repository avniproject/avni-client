/**
 * #2120 — the backend switch is one leg inside a sync, committed once.
 *
 * Drives the real dataServerSync, _switchBackendAndResyncRefDataIfNeeded,
 * _checkAndSwitchBackendMidSync and _finalizeMigrationState against a stand-in
 * SqliteMigrationService whose state record lives in memory. The committed backend
 * changes only after the transactional pull, the catch-up and every download succeed;
 * any failure before that fails the sync and hands the leg back to be abandoned.
 *
 * Run: npx jest test/service/SyncServiceMigrationLegTest.js --selectProjects unit --verbose
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

const ALL_ENTITIES_META_DATA = [
    {entityName: 'MyGroups', type: 'reference'},
    {entityName: 'Concept', type: 'reference'},
    {entityName: 'ProgramEnrolment', type: 'tx'},
    {entityName: 'UserInfo', type: 'tx'},
    {entityName: 'ResetSync', type: 'tx'},
    {entityName: 'SubjectMigration', type: 'tx'},
];

const SYNC_DETAILS = ['MyGroups', 'Concept', 'ProgramEnrolment', 'UserInfo']
    .map(entityName => ({entityName, entityTypeUuid: `${entityName}-uuid`, loadedSince: '2026-09-01T00:00:00.000Z'}));

/** A SqliteMigrationService stand-in: the committed backend, and the one the group names. */
function buildMigrationService({activeBackend, groupsName}) {
    const service = {
        state: {activeBackend, desiredBackend: activeBackend},
        computeDesiredBackend: jest.fn(() => groupsName),
        recordDesiredBackend: jest.fn(async (desired) => {
            service.state.desiredBackend = desired;
            return {...service.state};
        }),
        _captureAuthState: jest.fn(() => ({idpType: 'keycloak'})),
        beginLeg: jest.fn(async (target) => ({username: 'test-user', source: service.state.activeBackend, target})),
        prepareTarget: jest.fn(async () => {}),
        _bootstrapTargetSettings: jest.fn(async () => {}),
        commitLeg: jest.fn(async (leg) => { service.state.activeBackend = leg.target; }),
        abandonOpenLeg: jest.fn(async () => {}),
    };
    return service;
}

function buildSyncService(migrationService) {
    const svc = Object.create(SyncService.prototype);
    const resolved = () => Promise.resolve();

    svc.entitySyncStatusService = {
        updateAsPerSyncDetails: jest.fn(),
        removeRevokedPrivileges: jest.fn((_meta, syncDetails) => syncDetails),
    };
    svc.entityQueueService = {
        getPendingFieldDataCount: jest.fn(() => 0),
        getPendingFieldDataSummary: jest.fn(() => ''),
    };

    svc.pushData = jest.fn(resolved);
    svc.getResetSyncData = jest.fn(resolved);
    svc.getRefData = jest.fn(resolved);
    svc.getTxData = jest.fn(resolved);
    svc.getSyncDetails = jest.fn(async () => ({syncDetails: SYNC_DETAILS, endDateTime: 'end', now: 'now'}));
    svc.updateAsPerNewPrivilege = jest.fn((_all, _ups, syncDetails) => syncDetails);
    svc._catchUpTxDataAfterMigration = jest.fn(resolved);

    svc._disableForeignKeysIfSqlite = jest.fn();
    svc._enableForeignKeysIfSqlite = jest.fn();
    svc._enableShallowHydrationIfSqlite = jest.fn();
    svc._disableShallowHydrationIfSqlite = jest.fn();
    svc._checkForeignKeyIntegrityIfSqlite = jest.fn();
    svc._buildReferenceCacheIfSqlite = jest.fn();
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

const noop = () => {};
const manualSync = (svc) => svc.dataServerSync(ALL_ENTITIES_META_DATA, noop, noop, noop, noop, true, undefined, false);

const carries = (entityName) => (entitiesMetadata) => entitiesMetadata.some(e => e.entityName === entityName);

function failWhenPulling(entityName, error) {
    return jest.fn(async (entitiesMetadata) => {
        if (carries(entityName)(entitiesMetadata)) throw error;
    });
}

describe('the switch commits once, after the whole sync (#2120)', () => {
    beforeEach(() => {
        mockGlobalContext.switchBackend.mockClear();
    });

    it('commits the target only after the transactional pull, the catch-up and every download', async () => {
        const migrationService = buildMigrationService({activeBackend: 'realm', groupsName: 'sqlite'});
        const svc = buildSyncService(migrationService);

        await manualSync(svc);

        expect(migrationService.commitLeg).toHaveBeenCalledTimes(1);
        expect(migrationService.commitLeg.mock.calls[0][0]).toMatchObject({source: 'realm', target: 'sqlite'});
        const commitOrder = migrationService.commitLeg.mock.invocationCallOrder[0];
        const txPullIndex = svc.getTxData.mock.calls.findIndex(([meta]) => carries('ProgramEnrolment')(meta));
        expect(svc.getTxData.mock.invocationCallOrder[txPullIndex]).toBeLessThan(commitOrder);
        expect(svc._catchUpTxDataAfterMigration.mock.invocationCallOrder[0]).toBeLessThan(commitOrder);
        expect(svc.downloadContent.mock.invocationCallOrder[0]).toBeLessThan(commitOrder);
        expect(migrationService.abandonOpenLeg).not.toHaveBeenCalled();
        expect(migrationService.state.activeBackend).toBe('sqlite');
    });

    it('opens the leg before moving the runtime, and prepares the target after', async () => {
        const migrationService = buildMigrationService({activeBackend: 'realm', groupsName: 'sqlite'});
        const svc = buildSyncService(migrationService);

        await manualSync(svc);

        const switchOrder = mockGlobalContext.switchBackend.mock.invocationCallOrder[0];
        expect(migrationService.beginLeg.mock.invocationCallOrder[0]).toBeLessThan(switchOrder);
        expect(migrationService.prepareTarget.mock.invocationCallOrder[0]).toBeGreaterThan(switchOrder);
        expect(migrationService._captureAuthState.mock.invocationCallOrder[0]).toBeLessThan(switchOrder);
    });

    it('fails the sync and commits nothing when the transactional pull fails', async () => {
        const migrationService = buildMigrationService({activeBackend: 'realm', groupsName: 'sqlite'});
        const svc = buildSyncService(migrationService);
        const networkDown = new Error('network down');
        svc.getTxData = failWhenPulling('ProgramEnrolment', networkDown);

        await expect(manualSync(svc)).rejects.toBe(networkDown);

        expect(migrationService.commitLeg).not.toHaveBeenCalled();
        expect(migrationService.abandonOpenLeg).toHaveBeenCalledWith(networkDown);
        expect(migrationService.state.activeBackend).toBe('realm');
    });

    it('fails the sync and commits nothing when the reference pull onto the target fails', async () => {
        const migrationService = buildMigrationService({activeBackend: 'realm', groupsName: 'sqlite'});
        const svc = buildSyncService(migrationService);
        const refPullFailed = new Error('reference pull failed');
        svc.getRefData = failWhenPulling('Concept', refPullFailed);

        await expect(manualSync(svc)).rejects.toBe(refPullFailed);

        expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith('sqlite');
        expect(migrationService.commitLeg).not.toHaveBeenCalled();
        expect(migrationService.abandonOpenLeg).toHaveBeenCalledWith(refPullFailed);
    });

    it('fails the sync when the commit itself cannot be recorded', async () => {
        const migrationService = buildMigrationService({activeBackend: 'realm', groupsName: 'sqlite'});
        const diskFull = new Error('disk full');
        migrationService.commitLeg = jest.fn(async () => { throw diskFull; });
        const svc = buildSyncService(migrationService);

        await expect(manualSync(svc)).rejects.toBe(diskFull);

        expect(migrationService.abandonOpenLeg).toHaveBeenCalledWith(diskFull);
    });

    it('moves a user removed from the group back to Realm in the same sync', async () => {
        const migrationService = buildMigrationService({activeBackend: 'sqlite', groupsName: 'realm'});
        const svc = buildSyncService(migrationService);

        await manualSync(svc);

        expect(migrationService.beginLeg).toHaveBeenCalledWith('realm');
        expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith('realm');
        expect(migrationService.state.activeBackend).toBe('realm');
    });

    // dataServerSync sets the sync modes on the backend it starts on; leaving them set on a
    // backend the leg abandons would leave that SQLite proxy with FKs off and shallow reads on.
    it('resets the sync modes on the backend it is leaving before a switch', async () => {
        const migrationService = buildMigrationService({activeBackend: 'sqlite', groupsName: 'realm'});
        const svc = buildSyncService(migrationService);

        await manualSync(svc);

        const switchOrder = mockGlobalContext.switchBackend.mock.invocationCallOrder[0];
        expect(svc._enableForeignKeysIfSqlite.mock.invocationCallOrder[0]).toBeLessThan(switchOrder);
        expect(svc._disableShallowHydrationIfSqlite.mock.invocationCallOrder[0]).toBeLessThan(switchOrder);
    });

    it('opens no leg when the committed backend is already the one the group names', async () => {
        const migrationService = buildMigrationService({activeBackend: 'sqlite', groupsName: 'sqlite'});
        const svc = buildSyncService(migrationService);

        await manualSync(svc);

        expect(migrationService.recordDesiredBackend).toHaveBeenCalledWith('sqlite');
        expect(migrationService.beginLeg).not.toHaveBeenCalled();
        expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
        expect(migrationService.commitLeg).not.toHaveBeenCalled();
    });

    it('a failed sync with no migration owed still fails with its own error', async () => {
        const migrationService = buildMigrationService({activeBackend: 'realm', groupsName: 'realm'});
        const svc = buildSyncService(migrationService);
        const networkDown = new Error('network down');
        svc.getTxData = failWhenPulling('ProgramEnrolment', networkDown);

        await expect(manualSync(svc)).rejects.toBe(networkDown);

        expect(migrationService.commitLeg).not.toHaveBeenCalled();
    });
});
