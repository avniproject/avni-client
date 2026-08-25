/**
 * Regression tests for the data pulled during a mid-sync backend switch
 * (Realm → SQLite migration): the tx pull checkpoints and the ResetSync
 * handling.
 *
 * Tx pull: when a mid-sync backend switch happens, the
 * transactional download MUST use the POST-switch sync details — the new
 * SQLite backend's entity_sync_status is re-seeded to REALLY_OLD_DATE, so the
 * server has to be asked for the full history. The bug (silently introduced
 * during an earlier refactor) computed `filteredTxData` / the privileged sync
 * details ONCE from the PRE-switch (Realm) checkpoints and never recomputed
 * them after the switch, so the tx pull requested each entity with a recent
 * `loadedSince` and the migrated DB was left nearly empty.
 *
 * This test drives the real `dataServerSync` with stubbed collaborators and a
 * spy on `getTxData`, and asserts the checkpoints the tx pull actually uses.
 *
 * ResetSync: it is excluded from the reference re-sync that runs during the
 * switch, yet its checkpoint is seeded to REALLY_OLD_DATE — so the freshly built
 * SQLite backend had zero ResetSync rows and a REALLY_OLD checkpoint, and the
 * NEXT ordinary sync pulled the whole org's ResetSyncs (hasMigrated=false) while
 * Concept already existed, triggering a spurious Reset Sync. The fix pulls
 * ResetSync during the switch and marks them migrated, mirroring a fresh
 * install; that block drives the REAL `_switchBackendAndResyncRefDataIfNeeded`.
 *
 * Run: npx jest test/service/SyncServiceMigrationTxPullTest.js --selectProjects unit --verbose
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

const SyncService = require('../../src/service/SyncService').default;

const RECENT = '2024-12-03T11:44:51.008Z';
const REALLY_OLD = '1900-01-01T00:00:00.000Z';

const ALL_ENTITIES_META_DATA = [
    {entityName: 'Concept', type: 'reference'},
    {entityName: 'ProgramEnrolment', type: 'tx'},
    {entityName: 'Encounter', type: 'tx'},
    {entityName: 'ResetSync', type: 'tx'},
    {entityName: 'SubjectMigration', type: 'tx'},
];

const syncDetailsAt = (loadedSince) => [
    {entityName: 'Concept', entityTypeUuid: 'concept-uuid', loadedSince},
    {entityName: 'ProgramEnrolment', entityTypeUuid: 'pe-uuid', loadedSince},
    {entityName: 'Encounter', entityTypeUuid: 'enc-uuid', loadedSince},
];

/**
 * Build a SyncService whose orchestration methods (dataServerSync,
 * getMetadataByType, retainEntitiesPresentInCurrentVersion) are the REAL
 * prototype implementations, and whose collaborators are stubs. `switchResult`
 * is what _switchBackendAndResyncRefDataIfNeeded returns (null = no migration).
 */
function buildSyncService({preSwitch, switchResult}) {
    const svc = Object.create(SyncService.prototype);
    const noop = () => {};
    const resolved = () => Promise.resolve();

    svc.entitySyncStatusService = {
        updateAsPerSyncDetails: jest.fn(),
        removeRevokedPrivileges: jest.fn((_meta, syncDetails) => syncDetails),
    };

    svc.pushData = jest.fn(resolved);
    svc.getResetSyncData = jest.fn(resolved);
    svc.getRefData = jest.fn(resolved);
    svc.getSyncDetails = jest.fn(async () => ({
        syncDetails: preSwitch, endDateTime: 'pre-end', now: 'pre-now',
    }));
    svc._switchBackendAndResyncRefDataIfNeeded = jest.fn(async () => switchResult);
    // Pass-through: mirrors the real method's contract of returning the sync
    // details it was handed (privilege removal is not under test here).
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
    await svc.dataServerSync(
        ALL_ENTITIES_META_DATA,
        noop,   // statusMessageCallBack
        noop,   // onProgressPerEntity
        noop,   // onAfterMediaPush
        noop,   // updateProgressSteps
        false,  // isSyncResetRequired
        undefined, // userConfirmation
        false,  // isOnlyUploadRequired
    );
}

// The tx-data pull is the getTxData call carrying the real transactional
// entities (ProgramEnrolment / Encounter), as opposed to the UserInfo and
// SubjectMigration pulls.
function txDataPullCall(svc) {
    return svc.getTxData.mock.calls.find(([entitiesMetadata]) =>
        entitiesMetadata.some(e => e.entityName === 'ProgramEnrolment'));
}

function loadedSinceFor(syncDetails, entityName) {
    return syncDetails.find(sd => sd.entityName === entityName).loadedSince;
}

describe('SyncService transactional pull after mid-sync backend switch', () => {
    it('uses POST-switch checkpoints for the tx pull when a migration switch happens', async () => {
        const svc = buildSyncService({
            preSwitch: syncDetailsAt(RECENT),
            switchResult: {syncDetails: syncDetailsAt(REALLY_OLD), endDateTime: 'post-end'},
        });

        await runSync(svc);

        const call = txDataPullCall(svc);
        expect(call).toBeDefined();
        const [entitiesMetadata, , syncDetails, endDateTime] = call;

        // The tx pull must request the full history seeded on the new backend...
        expect(loadedSinceFor(syncDetails, 'ProgramEnrolment')).toBe(REALLY_OLD);
        expect(loadedSinceFor(syncDetails, 'Encounter')).toBe(REALLY_OLD);
        // ...never the stale pre-switch Realm checkpoints (the original regression).
        expect(loadedSinceFor(syncDetails, 'ProgramEnrolment')).not.toBe(RECENT);
        // ...and the post-switch endDateTime is used too.
        expect(endDateTime).toBe('post-end');
        expect(entitiesMetadata.map(e => e.entityName).sort()).toEqual(['Encounter', 'ProgramEnrolment']);
    });

    it('uses the pre-switch checkpoints for the tx pull when no migration switch happens', async () => {
        const svc = buildSyncService({
            preSwitch: syncDetailsAt(RECENT),
            switchResult: null, // no backend switch this sync
        });

        await runSync(svc);

        const call = txDataPullCall(svc);
        expect(call).toBeDefined();
        const [, , syncDetails, endDateTime] = call;

        expect(loadedSinceFor(syncDetails, 'ProgramEnrolment')).toBe(RECENT);
        expect(endDateTime).toBe('pre-end');
    });
});

describe('SyncService ResetSync handling during Realm->SQLite switch', () => {
    const SWITCH_ENTITIES_META_DATA = [...ALL_ENTITIES_META_DATA, {entityName: 'UserInfo', type: 'reference'}];

    function buildSwitchingService({switched}) {
        const svc = Object.create(SyncService.prototype);
        const noop = () => {};
        const resolved = () => Promise.resolve();

        svc._checkAndSwitchBackendMidSync = jest.fn(async () => switched);
        svc.getSyncDetails = jest.fn(async () => ({
            syncDetails: [{entityName: 'Concept'}, {entityName: 'UserInfo'}],
            endDateTime: 'end', now: 'now',
        }));
        svc.retainEntitiesPresentInCurrentVersion = (syncDetails) => syncDetails;
        svc.entitySyncStatusService = {updateAsPerSyncDetails: jest.fn()};
        svc._disableForeignKeysIfSqlite = noop;
        svc._enableShallowHydrationIfSqlite = noop;
        svc._buildReferenceCacheIfSqlite = jest.fn(resolved);
        svc.getTxData = jest.fn(resolved);
        svc.getRefData = jest.fn(resolved);
        svc.getResetSyncData = jest.fn(resolved);

        const resetSyncService = {markAllResetSyncsMigrated: jest.fn()};
        svc.getService = jest.fn((arg) =>
            arg === 'sqliteMigrationService'
                ? {getState: async () => ({}), persistState: async () => {}}
                : resetSyncService);
        svc._resetSyncService = resetSyncService;

        return svc;
    }

    it('pulls ResetSync into the new backend and marks it migrated on a switch', async () => {
        const svc = buildSwitchingService({switched: true});

        const result = await svc._switchBackendAndResyncRefDataIfNeeded(() => {}, () => {}, SWITCH_ENTITIES_META_DATA);

        expect(result).not.toBeNull();

        // ResetSync is pulled into the freshly built SQLite backend (advancing its checkpoint).
        expect(svc.getResetSyncData).toHaveBeenCalledTimes(1);
        const [resetMetadata] = svc.getResetSyncData.mock.calls[0];
        expect(resetMetadata.map(e => e.entityName)).toEqual(['ResetSync']);

        // ...and marked migrated, so the next sync sees no pending reset.
        expect(svc._resetSyncService.markAllResetSyncsMigrated).toHaveBeenCalledTimes(1);
    });

    it('does not touch ResetSync when no backend switch happens', async () => {
        const svc = buildSwitchingService({switched: false});

        const result = await svc._switchBackendAndResyncRefDataIfNeeded(() => {}, () => {}, SWITCH_ENTITIES_META_DATA);

        expect(result).toBeNull();
        expect(svc.getResetSyncData).not.toHaveBeenCalled();
        expect(svc._resetSyncService.markAllResetSyncsMigrated).not.toHaveBeenCalled();
    });
});
