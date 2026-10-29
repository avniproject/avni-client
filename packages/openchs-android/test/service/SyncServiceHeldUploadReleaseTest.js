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
    default: {logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(), elapsedMs: () => 0},
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

    it("run no hub sync and take no copy of the hub phone's queue: a server sync happens only outside a clinic camp", async () => {
        const {svc, steps} = buildSyncService({pullReleases: 1});
        svc.db = {isSqlite: true};
        const services = svc.getService;
        const clinic = {
            mirrorOwnQueue: jest.fn(), syncBeforeServerUpload: jest.fn(),
            afterServerSync: async () => { steps.push('drop waiting'); return {dropped: 0, reported: 0}; },
        };
        svc.getService = jest.fn((name) => ({...services(name), getSettings: () => ({enableClinicSharing: true}), ...clinic}));

        await runSync(svc);

        expect(steps).toEqual(['push', 'pull', 'drop waiting', 'push']);
        expect(clinic.mirrorOwnQueue).not.toHaveBeenCalled();
        expect(clinic.syncBeforeServerUpload).not.toHaveBeenCalled();
    });

    it("are followed by dropping the hub records still waiting from a camp, rather than saving them over the server's copy", async () => {
        const {svc, steps} = buildSyncService({pullReleases: 0});
        svc.db = {isSqlite: true};
        const services = svc.getService;
        const afterSync = jest.fn();
        svc.getService = jest.fn((name) => ({
            ...services(name),
            getSettings: () => ({enableClinicSharing: true}),
            afterSync,
            afterServerSync: async () => { steps.push('drop waiting'); return {dropped: 2, reported: 0}; },
        }));

        await runSync(svc);

        expect(steps).toEqual(['push', 'pull', 'drop waiting']);
        expect(afterSync).not.toHaveBeenCalled();
    });

    it("hold back a server reset while uploads still wait, so the reset does not delete them", async () => {
        const {svc} = buildSyncService({pullReleases: 0});
        const resetSync = jest.fn();
        const services = svc.getService;
        svc.getService = jest.fn((name) => ({...services(name), isResetSyncRequired: () => true, resetSync}));
        svc.entityQueueService = {getPendingFieldDataCount: () => 1, getPendingFieldDataSummary: () => 'Encounter=1'};
        svc.conventionalRestClient = {postAllEntities: jest.fn()};
        const userConfirmation = jest.fn(async () => 'YES');
        const statusMessageCallBack = jest.fn();

        await svc.dataServerSync(ALL_ENTITIES_META_DATA, statusMessageCallBack, () => {}, () => {}, () => {}, true, userConfirmation, false);

        expect(userConfirmation).not.toHaveBeenCalled();
        expect(resetSync).not.toHaveBeenCalled();
        expect(statusMessageCallBack).toHaveBeenCalledWith("resetWaitingOnUploads");
        expect(svc.conventionalRestClient.postAllEntities).not.toHaveBeenCalled();
    });

    describe("in an organisation using clinic sharing, with a reset due", () => {
        const heldVisit = {resource: {uuid: 'v-1'}};
        function clinicSyncService({stillWaiting, postAllEntities}) {
            const built = buildSyncService({pullReleases: 0});
            const {svc} = built;
            svc.db = {isSqlite: true};
            const resetSync = jest.fn();
            const services = svc.getService;
            svc.getService = jest.fn((name) => ({
                ...services(name), isResetSyncRequired: () => true, resetSync,
                getSettings: () => ({enableClinicSharing: true}),
                heldToTry: async (entitiesToPost) => entitiesToPost,
                afterServerSync: async () => ({dropped: 0, reported: 0}),
            }));
            svc.dispatchAction = jest.fn();
            svc.entityQueueService = {
                getPendingFieldDataCount: jest.fn(stillWaiting), getPendingFieldDataSummary: () => 'Encounter=1',
                getAllQueuedItems: (metaData) => ({metaData, entities: metaData.entityName === 'Encounter' ? [heldVisit] : []}),
                popItem: jest.fn(() => () => {}),
            };
            svc.conventionalRestClient = {postAllEntities: jest.fn(postAllEntities)};
            return {...built, resetSync};
        }
        const manualSync = (svc, statusMessageCallBack, userConfirmation, isManualSync = true) =>
            svc.dataServerSync(ALL_ENTITIES_META_DATA, statusMessageCallBack, () => {}, () => {}, () => {}, isManualSync, userConfirmation, false);

        it("try the waiting uploads first, and run the reset in the same sync once the server takes them", async () => {
            let waiting = 1;
            const {svc, resetSync} = clinicSyncService({
                stillWaiting: () => waiting,
                postAllEntities: async (allEntities) => { waiting = 0; },
            });
            const userConfirmation = jest.fn(async () => 'YES');

            await manualSync(svc, jest.fn(), userConfirmation);

            const posted = svc.conventionalRestClient.postAllEntities.mock.calls[0][0];
            expect(posted.flatMap(({entities}) => entities.map(({resource}) => resource.uuid))).toEqual(['v-1']);
            expect(userConfirmation).toHaveBeenCalled();
            expect(resetSync).toHaveBeenCalled();
        });

        it("keep the reset waiting, delete nothing, and say so on the sync screen when the server refuses them", async () => {
            const {svc, steps, resetSync} = clinicSyncService({
                stillWaiting: () => 1,
                postAllEntities: async () => { throw new Error("Http 500: Individual not found"); },
            });
            const userConfirmation = jest.fn(async () => 'YES');
            const statusMessageCallBack = jest.fn();

            await manualSync(svc, statusMessageCallBack, userConfirmation);

            expect(svc.conventionalRestClient.postAllEntities).toHaveBeenCalled();
            expect(userConfirmation).not.toHaveBeenCalled();
            expect(resetSync).not.toHaveBeenCalled();
            expect(statusMessageCallBack).toHaveBeenCalledWith("resetWaitingOnUploads");
            expect(steps).toContain('pull');
        });

        it("try nothing on a background sync, where no reset runs", async () => {
            const {svc, resetSync} = clinicSyncService({stillWaiting: () => 1, postAllEntities: async () => {}});
            const statusMessageCallBack = jest.fn();

            await manualSync(svc, statusMessageCallBack, undefined, false);

            expect(svc.conventionalRestClient.postAllEntities).not.toHaveBeenCalled();
            expect(statusMessageCallBack).not.toHaveBeenCalledWith("resetWaitingOnUploads");
            expect(resetSync).not.toHaveBeenCalled();
        });
    });

    it("run the server reset as before once nothing waits to upload", async () => {
        const {svc} = buildSyncService({pullReleases: 0});
        const resetSync = jest.fn();
        const services = svc.getService;
        svc.getService = jest.fn((name) => ({...services(name), isResetSyncRequired: () => true, resetSync}));
        svc.entityQueueService = {getPendingFieldDataCount: () => 0};
        const userConfirmation = jest.fn(async () => 'YES');

        await svc.dataServerSync(ALL_ENTITIES_META_DATA, () => {}, () => {}, () => {}, () => {}, true, userConfirmation, false);

        expect(resetSync).toHaveBeenCalled();
    });

    describe("uploads that have waited 3 days", () => {
        function reportingSyncService() {
            const built = buildSyncService({pullReleases: 1});
            const {svc, steps} = built;
            svc.db = {isSqlite: true};
            const services = svc.getService;
            svc.getService = jest.fn((name) => ({
                ...services(name), getSettings: () => ({enableClinicSharing: true}),
                afterServerSync: async () => ({dropped: 0, reported: 0}),
                reportLongWaiting: async () => { steps.push('report'); return 0; },
            }));
            return built;
        }

        it("are reported after the uploads the pull released have gone up, so one that cleared in this sync is not reported", async () => {
            const {svc, steps} = reportingSyncService();

            await runSync(svc);

            expect(steps).toEqual(['push', 'pull', 'push', 'report']);
        });

        it("are reported after the upload on an upload-only sync", async () => {
            const {svc, steps} = reportingSyncService();

            await svc.dataServerSync(ALL_ENTITIES_META_DATA, () => {}, () => {}, () => {}, () => {}, false, undefined, true);

            expect(steps).toEqual(['push', 'report']);
        });

        it("never fail the sync when the report cannot be made", async () => {
            const {svc, steps} = reportingSyncService();
            const services = svc.getService;
            svc.getService = jest.fn((name) => ({...services(name), reportLongWaiting: async () => { throw new Error("clinic file locked"); }}));

            await runSync(svc);

            expect(steps).toEqual(['push', 'pull', 'push']);
        });
    });

    it('cause no second push when the pull released nothing', async () => {
        const {svc, steps} = buildSyncService({pullReleases: 0});

        await runSync(svc);

        expect(steps).toEqual(['push', 'pull']);
    });
});
