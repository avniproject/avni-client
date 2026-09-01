/**
 * Regression tests for #2006 (second defect): locally created data that has not
 * yet reached the server is lost when the backend switches from Realm to SQLite.
 *
 * Two independent holes are covered here:
 *
 *   1. The tx pull's upper bound is the server's `now - 10s`. Records uploaded by
 *      THIS sync are stamped after that bound, so the migration's full pull skips
 *      them — and the source DB, where they were the only copy, is then abandoned.
 *      A catch-up delta pull against a freshly fetched window brings them across.
 *
 *   2. Nothing checked the outbox before switching. If anything is still waiting to
 *      be uploaded, migrating strands it in Realm forever, so the switch is deferred.
 *
 * Run: npx jest test/service/SyncServiceMigrationUnsyncedDataTest.js --selectProjects unit --verbose
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

const _ = require('lodash');

const REALLY_OLD = '1900-01-01T00:00:00.000Z';
// Server clock right after this sync's upload, and a pull window that has moved past it.
const UPLOADED_AT = '2026-08-18T09:30:00.000Z';
const WINDOW_BEFORE_UPLOAD = '2026-08-18T09:29:59.990Z';
const WINDOW_PAST_UPLOAD = '2026-08-18T09:30:20.000Z';
const AFTER_MIGRATION_PULL = '2026-08-18T09:00:00.000Z';

const ALL_ENTITIES_META_DATA = [
    {entityName: 'Concept', type: 'reference'},
    {entityName: 'Individual', type: 'tx'},
    {entityName: 'Encounter', type: 'tx'},
    {entityName: 'ResetSync', type: 'tx'},
    {entityName: 'SubjectMigration', type: 'tx'},
];

const syncDetailsAt = (loadedSince) => [
    {entityName: 'Concept', entityTypeUuid: 'concept-uuid', loadedSince},
    {entityName: 'Individual', entityTypeUuid: 'st-uuid', loadedSince},
    {entityName: 'Encounter', entityTypeUuid: 'enc-uuid', loadedSince},
];

/**
 * `switchResult` is what _switchBackendAndResyncRefDataIfNeeded returns (null = no
 * migration). getSyncDetails answers with the pre-switch checkpoints first and the
 * post-pull ones on every later call, so a catch-up pull is distinguishable.
 */
function buildSyncService({switchResult, catchUpEndDateTimes = [WINDOW_PAST_UPLOAD]}) {
    const svc = Object.create(SyncService.prototype);
    const noop = () => {};
    const resolved = () => Promise.resolve();

    svc.entitySyncStatusService = {
        updateAsPerSyncDetails: jest.fn(),
        removeRevokedPrivileges: jest.fn((_meta, syncDetails) => syncDetails),
    };
    svc.entityQueueService = {getPendingFieldDataCount: jest.fn(() => 0)};

    let syncDetailsCallCount = 0;
    svc.getSyncDetails = jest.fn(async () => {
        syncDetailsCallCount += 1;
        if (syncDetailsCallCount === 1) {
            return {syncDetails: syncDetailsAt(REALLY_OLD), endDateTime: 'pre-end', now: UPLOADED_AT};
        }
        return {
            syncDetails: syncDetailsAt(AFTER_MIGRATION_PULL),
            endDateTime: catchUpEndDateTimes.shift() || _.last(catchUpEndDateTimes),
            now: 'catch-up-now',
        };
    });

    svc.pushData = jest.fn(resolved);
    svc.getResetSyncData = jest.fn(resolved);
    svc.getRefData = jest.fn(resolved);
    svc._switchBackendAndResyncRefDataIfNeeded = jest.fn(async () => switchResult);
    svc.updateAsPerNewPrivilege = jest.fn((_all, _ups, syncDetails) => syncDetails);
    svc.getTxData = jest.fn(resolved);

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

    svc.getService = jest.fn(() => ({
        isResetSyncRequired: () => false,
        encryptOrDecryptDbIfRequired: resolved,
        migrateSubjects: resolved,
    }));

    return svc;
}

async function runSync(svc) {
    const noop = () => {};
    await svc.dataServerSync(ALL_ENTITIES_META_DATA, noop, noop, noop, noop, false, undefined, false);
}

// Pulls carrying the real transactional entities, as opposed to the UserInfo and
// SubjectMigration pulls, in call order.
function txDataPullCalls(svc) {
    return svc.getTxData.mock.calls.filter(([entitiesMetadata]) =>
        entitiesMetadata.some(e => e.entityName === 'Individual'));
}

describe('unsynced data across a mid-sync backend switch (#2006)', () => {
    beforeEach(() => {
        mockGlobalContext.switchBackend.mockClear();
        mockGlobalContext.getActiveBackend.mockReturnValue('realm');
    });

    it('pulls again with a fresh window so records uploaded by this sync are not skipped', async () => {
        const svc = buildSyncService({
            switchResult: {syncDetails: syncDetailsAt(REALLY_OLD), endDateTime: 'post-end'},
        });

        await runSync(svc);

        const calls = txDataPullCalls(svc);
        expect(calls).toHaveLength(2);

        // The migration's full pull — everything the server has up to its window.
        expect(calls[0][3]).toBe('post-end');

        // The catch-up pull — a fresh window, so the individual uploaded at the top
        // of this sync (stamped after `post-end`) is finally fetched.
        const [, , catchUpSyncDetails, catchUpEndDateTime] = calls[1];
        expect(catchUpEndDateTime).toBe(WINDOW_PAST_UPLOAD);
        expect(catchUpSyncDetails.find(sd => sd.entityName === 'Individual').loadedSince)
            .toBe(AFTER_MIGRATION_PULL);
    });

    it('waits for the pull window to move past this sync\'s uploads before catching up', async () => {
        const svc = buildSyncService({
            switchResult: {syncDetails: syncDetailsAt(REALLY_OLD), endDateTime: 'post-end'},
            // First window sits 10ms before the upload; the retry has moved past it.
            catchUpEndDateTimes: [WINDOW_BEFORE_UPLOAD, WINDOW_PAST_UPLOAD],
        });

        await runSync(svc);

        const calls = txDataPullCalls(svc);
        expect(calls).toHaveLength(2);
        // Never pulls against the window that would have skipped our own uploads.
        expect(calls[1][3]).toBe(WINDOW_PAST_UPLOAD);
    });

    it('does not run a catch-up pull when no migration switch happened', async () => {
        const svc = buildSyncService({switchResult: null});

        await runSync(svc);

        expect(txDataPullCalls(svc)).toHaveLength(1);
    });
});

describe('backend switch is deferred while local data is unsynced (#2006)', () => {
    function buildSwitchCandidate(pendingFieldDataCount) {
        const svc = Object.create(SyncService.prototype);
        svc.entityQueueService = {
            getPendingFieldDataCount: jest.fn(() => pendingFieldDataCount),
            getPendingFieldDataSummary: jest.fn(() => `Individual=${pendingFieldDataCount}`),
        };
        svc.entitySyncStatusService = {setup: jest.fn()};
        svc.getService = jest.fn((name) => name === 'sqliteMigrationService' ? migrationService : undefined);
        return svc;
    }

    const migrationService = {
        computeDesiredBackend: jest.fn(() => 'sqlite'),
        _captureAuthState: jest.fn(() => ({idpType: 'keycloak'})),
        getState: jest.fn(async () => ({phase: 'idle'})),
        persistState: jest.fn(async () => {}),
        _bootstrapTargetSettings: jest.fn(async () => {}),
        _resetTargetBackend: jest.fn(),
    };

    beforeEach(() => {
        mockGlobalContext.switchBackend.mockClear();
        mockGlobalContext.getActiveBackend.mockReturnValue('realm');
        migrationService.persistState.mockClear();
        migrationService._resetTargetBackend.mockClear();
    });

    it('does not switch while the outbox still holds field data', async () => {
        const svc = buildSwitchCandidate(3);

        const switched = await svc._checkAndSwitchBackendMidSync(() => {});

        expect(switched).toBe(false);
        expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
        expect(migrationService.persistState).not.toHaveBeenCalled();
    });

    it('switches once the outbox is empty', async () => {
        const svc = buildSwitchCandidate(0);

        const switched = await svc._checkAndSwitchBackendMidSync(() => {});

        expect(switched).toBe(true);
        expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith('sqlite');
    });

    // The target file is shared across users and holds whatever the last one left, so
    // migrating into it without a wipe merges the two (#2083).
    it('empties the target backend after switching to it', async () => {
        const svc = buildSwitchCandidate(0);

        await svc._checkAndSwitchBackendMidSync(() => {});

        expect(migrationService._resetTargetBackend).toHaveBeenCalled();
    });

    it('does not touch the target backend when the switch is deferred', async () => {
        const svc = buildSwitchCandidate(3);

        await svc._checkAndSwitchBackendMidSync(() => {});

        expect(migrationService._resetTargetBackend).not.toHaveBeenCalled();
    });
});

// The SQLite batch persist path skips parent re-saves, so it must explicitly
// rederive the parent's latestEntityApprovalStatus link when an approval-status
// page lands. These pin that call — the defect was the call being absent.
describe('_persistAllBatch — approval status link recompute', () => {
    function buildBatchSyncService() {
        const svc = Object.create(SyncService.prototype);
        svc.db = {
            isSqlite: true,
            bulkCreate: jest.fn(async () => {}),
            recomputeLatestEntityApprovalStatus: jest.fn(),
        };
        svc.entitySyncStatusService = {get: jest.fn(() => ({uuid: 'ess-uuid'}))};
        svc.getCreateEntityFunctions = jest.fn(() => []);
        svc.bulkSaveOrUpdate = jest.fn();
        return svc;
    }

    const subjectEasMetaData = {
        entityName: 'SubjectEntityApprovalStatus',
        schemaName: 'EntityApprovalStatus',
        parent: {entityName: 'Individual', schemaName: 'Individual'},
        syncStatus: {entityTypeUuid: 'st-1'},
    };

    const encounterMetaData = {
        entityName: 'Encounter',
        schemaName: 'Encounter',
        parent: {entityName: 'Individual', schemaName: 'Individual'},
        syncStatus: {entityTypeUuid: 'et-1'},
    };

    it('recomputes the parent link with distinct entityUUIDs after an approval-status page', async () => {
        const svc = buildBatchSyncService();
        const entities = [
            {uuid: 'e1', entityUUID: 'i1'},
            {uuid: 'e2', entityUUID: 'i1'},
            {uuid: 'e3', entityUUID: null},
            {uuid: 'e4', entityUUID: 'i2'},
        ];

        await svc._persistAllBatch(subjectEasMetaData, [], entities, '2026-08-24T00:00:00.000Z');

        expect(svc.db.bulkCreate).toHaveBeenCalledWith('EntityApprovalStatus', entities);
        expect(svc.db.recomputeLatestEntityApprovalStatus).toHaveBeenCalledTimes(1);
        expect(svc.db.recomputeLatestEntityApprovalStatus).toHaveBeenCalledWith('Individual', ['i1', 'i2']);
    });

    it('does not recompute for non-approval-status entity types', async () => {
        const svc = buildBatchSyncService();
        await svc._persistAllBatch(encounterMetaData, [], [{uuid: 'e1', individualUUID: 'i1'}], '2026-08-24T00:00:00.000Z');
        expect(svc.db.recomputeLatestEntityApprovalStatus).not.toHaveBeenCalled();
    });
});
