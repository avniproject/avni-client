/**
 * Regression test for #2115 AC 4 (restoring a prepared catchment database must not
 * trigger a spurious reset).
 *
 * A restored device is full, so isDatabaseNeverSynced() — which is just "is there a
 * Concept row" — returns false and the fresh-device short-circuit in
 * isResetSyncRequired() does not fire. Any reset still outstanding in the restored
 * file therefore wipes the file that was just restored.
 *
 * A reset is satisfied by the discard-and-re-pull, not by the sync that follows, and
 * the restore is exactly that: it replaces the database wholesale with data pulled
 * under current scope, then resets its checkpoints and re-pulls. So the resets the
 * restored file carries are already satisfied and must be marked migrated.
 *
 * Run: npx jest test/service/BackupRestoreRealmServiceResetSyncTest.js --selectProjects unit
 */

jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({
    zip: jest.fn(async () => 'zipped'),
    unzip: jest.fn(async () => 'unzipped'),
    subscribe: jest.fn(() => ({remove: jest.fn()})),
}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false),
    setGenericPassword: jest.fn(async () => {}),
    resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock('react-native-fs', () => ({
    DocumentDirectoryPath: '/documents',
    exists: jest.fn(async () => true),
    copyFile: jest.fn(async () => {}),
    moveFile: jest.fn(async () => {}),
    unlink: jest.fn(async () => {}),
    readDir: jest.fn(async () => [{name: 'restored.realm', path: '/tmp/restored.realm'}]),
}));
jest.mock('../../src/framework/http/requests', () => ({
    get: jest.fn(async (url) => (url.endsWith('/exists') ? 'true' : 'https://download.example/dump.zip')),
    getJSON: jest.fn(async () => ({})),
}));
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {
        logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(),
        logErrorAsInfo: jest.fn(), randomUUID: () => 'generated-uuid',
    },
}));

const BackupRestoreRealmService = require('../../src/service/BackupRestoreRealmService').default;

function buildService() {
    const service = Object.create(BackupRestoreRealmService.prototype);
    const resetSyncService = {markAllResetSyncsMigrated: jest.fn()};
    const entitySyncStatusService = {setup: jest.fn()};

    const registry = {
        SettingsService: {
            getSettings: () => ({
                serverURL: 'https://server.example',
                userId: 'field-user',
                clone: () => ({serverURL: 'https://server.example', userId: 'field-user', locale: 'en'}),
            }),
            saveOrUpdate: jest.fn(),
        },
        MediaService: {downloadFromUrl: jest.fn(async () => {})},
        EntitySyncStatusService: entitySyncStatusService,
        entitySyncStatusService,
        ResetSyncService: resetSyncService,
        resetSyncService,
        UserInfoService: {saveOrUpdate: jest.fn(), getUserInfo: () => ({username: 'field-user'})},
    };

    service.getService = jest.fn((requested) => {
        const key = typeof requested === 'string' ? requested : requested.name;
        return registry[key] || registry[key && key.charAt(0).toLowerCase() + key.slice(1)];
    });

    // Everything the restore does to the database after the file is in place. Stubbed:
    // this test is about whether outstanding resets are marked, not about personalisation.
    service.dumpFileRestoreCompleted = jest.fn(async () => {});
    service._restoreSettings = jest.fn();
    service._deleteUserInfoAndIdAssignment = jest.fn();
    service._deleteDrafts = jest.fn();
    service._restoreUserInfo = jest.fn();
    service._deleteUserGroups = jest.fn();
    service._deleteUserSubjectAssignments = jest.fn();
    service._deleteIndividualAndDependentForDirectlyAssignableSubjectTypes = jest.fn();

    return {service, resetSyncService, entitySyncStatusService};
}

const runRestore = (service) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('restore never reported completion')), 5000);
    service.restore((progress, message, failed, error) => {
        if (progress === 100) {
            clearTimeout(timer);
            if (message === 'restoreFailed') reject(error || new Error('restore failed'));
            else resolve(message);
        }
    });
});

describe('BackupRestoreRealmService — a restore satisfies any outstanding reset (#2115)', () => {
    it('marks pending reset syncs migrated, so the next sync does not wipe the restored file', async () => {
        const {service, resetSyncService} = buildService();

        const outcome = await runRestore(service);

        expect(outcome).toBe('restoreComplete');
        expect(resetSyncService.markAllResetSyncsMigrated).toHaveBeenCalled();
    });

    it('marks them only after the restored database is in place', async () => {
        const {service, resetSyncService, entitySyncStatusService} = buildService();

        await runRestore(service);

        const markedAt = resetSyncService.markAllResetSyncsMigrated.mock.invocationCallOrder[0];
        const dbInPlaceAt = service.dumpFileRestoreCompleted.mock.invocationCallOrder[0];
        const checkpointsSetUpAt = entitySyncStatusService.setup.mock.invocationCallOrder[0];
        expect(markedAt).toBeGreaterThan(dbInPlaceAt);
        expect(markedAt).toBeGreaterThan(checkpointsSetUpAt);
    });
});
