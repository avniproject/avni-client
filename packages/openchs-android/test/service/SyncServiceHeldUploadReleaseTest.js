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
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => ({getActiveBackend: () => 'sqlite', beanRegistry: {register: jest.fn()}})},
}));

const SyncService = require('../../src/service/SyncService').default;

const ALL_ENTITIES_META_DATA = [
    {entityName: 'Concept', type: 'reference'},
    {entityName: 'Individual', type: 'tx'},
    {entityName: 'Encounter', type: 'tx'},
];

function buildSyncService({pullReleases}) {
    const svc = Object.create(SyncService.prototype);
    svc.db = {isSqlite: false};
    const resolved = () => Promise.resolve();
    const steps = [];
    svc.entitySyncStatusService = {updateAsPerSyncDetails: jest.fn(), removeRevokedPrivileges: jest.fn((_m, sd) => sd)};
    svc.getSyncDetails = jest.fn(async () => ({
        syncDetails: ALL_ENTITIES_META_DATA.map(({entityName}) => ({entityName, entityTypeUuid: '', loadedSince: '1900-01-01T00:00:00.000Z'})),
        endDateTime: 'end', now: 'now',
    }));
    svc.pushData = jest.fn(async () => { steps.push('push'); });
    svc.getTxData = jest.fn(async (metaData) => {
        if (metaData.some(({entityName}) => entityName === 'Individual')) {
            steps.push('pull');
            svc.releasedHoldBacks += pullReleases;
        }
    });
    svc.getResetSyncData = jest.fn(resolved);
    svc.getRefData = jest.fn(resolved);
    svc._switchBackendAndResyncRefDataIfNeeded = jest.fn(async () => null);
    svc.updateAsPerNewPrivilege = jest.fn((_all, _ups, syncDetails) => syncDetails);
    ['_disableForeignKeysIfSqlite', '_enableForeignKeysIfSqlite', '_enableShallowHydrationIfSqlite',
        '_disableShallowHydrationIfSqlite', '_checkForeignKeyIntegrityIfSqlite'].forEach((name) => { svc[name] = () => {}; });
    ['_buildReferenceCacheIfSqlite', 'downloadNewsImages', 'downloadExtensions', 'downloadCustomCardHtmlFiles',
        'downloadFormShareTemplates', 'downloadIcons', 'downloadContent'].forEach((name) => { svc[name] = jest.fn(resolved); });
    svc.getService = jest.fn(() => ({isResetSyncRequired: () => false, encryptOrDecryptDbIfRequired: resolved, migrateSubjects: resolved}));
    return {svc, steps};
}

const runSync = (svc) => svc.dataServerSync(ALL_ENTITIES_META_DATA, () => {}, () => {}, () => {}, () => {}, false, undefined, false);

describe('Uploads released by the pull', () => {
    it('are pushed in the same sync, after the pull', async () => {
        const {svc, steps} = buildSyncService({pullReleases: 1});

        await runSync(svc);

        expect(steps).toEqual(['push', 'pull', 'push']);
    });

    it('follow a mirror of the hub phone\'s own queue, taken before the first push pops it', async () => {
        const {svc, steps} = buildSyncService({pullReleases: 0});
        svc.db = {isSqlite: true};
        const services = svc.getService;
        svc.getService = jest.fn((name) => ({
            ...services(name),
            getSettings: () => ({enableClinicSharing: true}),
            mirrorOwnQueueIfRunning: async () => { steps.push('mirror'); },
            syncBeforeServerUpload: async () => {},
            afterSync: async () => ({applied: 0, reported: 0}),
        }));

        await runSync(svc);

        expect(steps).toEqual(['mirror', 'push', 'pull']);
    });

    it("send a joined phone's records to the hub before the server upload empties its queue, with server sync marked running throughout", async () => {
        const {svc, steps} = buildSyncService({pullReleases: 0});
        svc.db = {isSqlite: true};
        const services = svc.getService;
        svc.getService = jest.fn((name) => ({
            ...services(name),
            getSettings: () => ({enableClinicSharing: true}),
            mirrorOwnQueueIfRunning: async () => {},
            syncBeforeServerUpload: async () => { steps.push(`hub (running: ${svc.serverSyncRunning})`); },
            afterSync: async () => ({applied: 0, reported: 0}),
        }));
        const push = svc.pushData;
        svc.pushData = jest.fn(async (...args) => { steps.push(`running: ${svc.serverSyncRunning}`); return push(...args); });

        await runSync(svc);

        expect(steps).toEqual(['hub (running: true)', 'running: true', 'push', 'pull']);
        expect(svc.serverSyncRunning).toBe(false);
    });

    it('clear the server-sync-running mark when the sync fails', async () => {
        const {svc} = buildSyncService({pullReleases: 0});
        svc.pushData = jest.fn(async () => { throw new Error('network down'); });

        await expect(runSync(svc)).rejects.toThrow('network down');
        expect(svc.serverSyncRunning).toBe(false);
    });

    it('cause no second push when the pull released nothing', async () => {
        const {svc, steps} = buildSyncService({pullReleases: 0});

        await runSync(svc);

        expect(steps).toEqual(['push', 'pull']);
    });
});
