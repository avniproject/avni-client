/**
 * Regression test for #2006 (reference data fetched twice on the migration sync).
 *
 * `_switchBackendAndResyncRefDataIfNeeded` decides whether to migrate by reading
 * MyGroups, so MyGroups must be pulled before it runs. But the pre-switch pull used
 * to fetch the ENTIRE reference dataset, and a switch then abandons that backend and
 * re-pulls all of it into SQLite — so every reference entity was fetched twice
 * (measured: 8,931 redundant rows, ~22% of the migration sync).
 *
 * Contract: dataServerSync pulls only the migration-decision entity before the switch
 * check; the bulk is pulled exactly once, by whoever owns the backend afterwards.
 *
 * Run: npx jest test/service/SyncServiceRefDataDoublePullTest.js --selectProjects unit
 */

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

// MyGroups is the entity the migration decision reads; the rest stand in for the
// bulk reference dataset (Concept/ConceptAnswer/FormElement/... in the field).
const REFERENCE_ENTITIES = ['MyGroups', 'Concept', 'ConceptAnswer', 'FormElement', 'Groups'];

const ALL_ENTITIES_META_DATA = [
    ...REFERENCE_ENTITIES.map(entityName => ({entityName, type: 'reference'})),
    {entityName: 'ProgramEnrolment', type: 'tx'},
    {entityName: 'Encounter', type: 'tx'},
    {entityName: 'UserInfo', type: 'tx'},
    {entityName: 'ResetSync', type: 'tx'},
    {entityName: 'SubjectMigration', type: 'tx'},
];

const syncDetailsAt = (loadedSince) =>
    ALL_ENTITIES_META_DATA
        .filter(({entityName}) => !['ResetSync', 'SubjectMigration'].includes(entityName))
        .map(({entityName}) => ({entityName, entityTypeUuid: `${entityName}-uuid`, loadedSince}));

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
    svc.updateAsPerNewPrivilege = jest.fn((_all, _ups, syncDetails) => syncDetails);
    svc._catchUpTxDataAfterMigration = jest.fn(resolved);

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
        noop, noop, noop, noop,
        false, undefined, false,
    );
}

// Every reference entity name dataServerSync itself asked getRefData to pull, in order.
function refPulled(svc) {
    return svc.getRefData.mock.calls.flatMap(([entitiesMetadata]) =>
        entitiesMetadata.map(e => e.entityName));
}

const BULK_REFERENCE = REFERENCE_ENTITIES.filter(n => n !== 'MyGroups');

describe('reference data is not fetched twice on the migration sync (#2006)', () => {
    it('pulls only the migration-decision entity before the backend switch', async () => {
        const svc = buildSyncService({
            preSwitch: syncDetailsAt(RECENT),
            switchResult: {syncDetails: syncDetailsAt(REALLY_OLD), endDateTime: 'post-end'},
        });

        await runSync(svc);

        const pulled = refPulled(svc);

        // MyGroups must be fresh — the switch decision reads it.
        expect(pulled).toContain('MyGroups');
        // The bulk must NOT be pulled here: the switch re-pulls all of it into SQLite,
        // so anything fetched now is thrown away with the abandoned Realm DB.
        expect(pulled.filter(n => BULK_REFERENCE.includes(n))).toEqual([]);
    });

    it('pulls MyGroups before running the switch check', async () => {
        const svc = buildSyncService({
            preSwitch: syncDetailsAt(RECENT),
            switchResult: {syncDetails: syncDetailsAt(REALLY_OLD), endDateTime: 'post-end'},
        });

        await runSync(svc);

        const myGroupsPull = svc.getRefData.mock.calls.find(([meta]) =>
            meta.some(e => e.entityName === 'MyGroups'));
        expect(myGroupsPull).toBeDefined();

        const firstRefOrder = svc.getRefData.mock.invocationCallOrder[0];
        const switchOrder = svc._switchBackendAndResyncRefDataIfNeeded.mock.invocationCallOrder[0];
        expect(firstRefOrder).toBeLessThan(switchOrder);
    });

    it('still pulls every reference entity exactly once when no switch happens', async () => {
        const svc = buildSyncService({
            preSwitch: syncDetailsAt(RECENT),
            switchResult: null,
        });

        await runSync(svc);

        const pulled = refPulled(svc);
        expect(pulled.slice().sort()).toEqual(REFERENCE_ENTITIES.slice().sort());
        expect(new Set(pulled).size).toBe(pulled.length); // no entity pulled twice
    });
});
