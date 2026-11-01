/**
 * avniproject/avni-client#2099: the sync cursor is the last row's timestamp AND its uuid.
 *
 * A sync interrupted inside a group of rows sharing one lastModifiedDateTime used to restart that
 * group on resume, because the timestamp alone cannot say where in the group the phone stopped.
 * The phone now keeps the last row's uuid (lastUuid) next to loadedSince and sends it as afterUuid.
 *
 * Run: npx jest test/service/SyncResumeCursorTest.js
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
    default: {logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(), elapsedMs: () => 0},
}));
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => ({getActiveBackend: () => 'realm', beanRegistry: {register: jest.fn()}})},
}));

const SyncService = require('../../src/service/SyncService').default;
const EntitySyncStatusService = require('../../src/service/EntitySyncStatusService').default;
const {EntitySyncStatus} = require('openchs-models');

const GROUP_TIME = '2023-12-11T05:01:41.519Z';
const EARLIER = '2023-12-11T05:01:40.000Z';

function syncServiceFor(isSqlite) {
    const svc = Object.create(SyncService.prototype);
    svc.db = isSqlite ? {isSqlite: true, bulkCreate: jest.fn(async () => {})} : {isSqlite: false};
    svc.entitySyncStatusService = {get: jest.fn(() => ({uuid: 'ess-uuid'}))};
    svc.getCreateEntityFunctions = jest.fn((schemaName, entities) => entities.map((entity) => ({schemaName, entity})));
    svc.bulkSaveOrUpdate = jest.fn();
    svc.dispatchAction = jest.fn();
    svc._clinicSharingEnabled = () => false;
    return svc;
}

const encounterMetaData = {
    entityName: 'Encounter',
    schemaName: 'Encounter',
    entityClass: {fromResource: (resource) => ({uuid: resource.uuid})},
    syncStatus: {entityTypeUuid: 'et-1'},
};

function savedSyncStatus(svc) {
    const calls = svc.bulkSaveOrUpdate.mock.calls;
    const fns = calls[calls.length - 1][0];
    return fns.find(({schemaName}) => schemaName === EntitySyncStatus.schema.name).entity;
}

describe('persistAll keeps the last row of the page as the cursor', () => {
    // The server sends a group in (lastModifiedDateTime, id) order; the page is re-sorted by time only,
    // and that sort is stable, so the server's last row stays last.
    const page = [
        {uuid: 'z-first-in-group', lastModifiedDateTime: GROUP_TIME},
        {uuid: 'a-earlier', lastModifiedDateTime: EARLIER},
        {uuid: 'm-last-in-group', lastModifiedDateTime: GROUP_TIME},
    ];

    [false, true].forEach((isSqlite) => {
        it(`stores loadedSince and lastUuid of the last row (${isSqlite ? 'SQLite' : 'Realm'})`, async () => {
            const svc = syncServiceFor(isSqlite);
            await svc.persistAll(encounterMetaData, page.map((row) => ({...row})), {});

            const status = savedSyncStatus(svc);
            expect(status.loadedSince).toEqual(new Date(GROUP_TIME));
            expect(status.lastUuid).toBe('m-last-in-group');
            expect(status.uuid).toBe('ess-uuid');
        });
    });
});

describe('the transactional pull carries the stored cursor', () => {
    it('hands each kind its lastUuid alongside the sync details from the server', async () => {
        const svc = Object.create(SyncService.prototype);
        svc.entitySyncStatusService = {
            lastUuidFor: jest.fn(({entityTypeUuid}) => (entityTypeUuid === 'et-1' ? 'last-row' : null)),
        };
        svc.getData = jest.fn(async () => {});
        const syncDetails = [
            {entityName: 'Encounter', entityTypeUuid: 'et-1', loadedSince: GROUP_TIME, uuid: 's1'},
            {entityName: 'Encounter', entityTypeUuid: 'et-2', loadedSince: GROUP_TIME, uuid: 's2'},
        ];

        await svc.getTxData([{entityName: 'Encounter'}], jest.fn(), syncDetails, 'now');

        const pulled = svc.getData.mock.calls[0][0];
        expect(pulled.map(({syncStatus}) => [syncStatus.entityTypeUuid, syncStatus.lastUuid, syncStatus.loadedSince]))
            .toEqual([['et-1', 'last-row', GROUP_TIME], ['et-2', null, GROUP_TIME]]);
    });
});

describe('EntitySyncStatusService keeps the cursor only while loadedSince stays put', () => {
    function serviceHolding(rows) {
        const service = Object.create(EntitySyncStatusService.prototype);
        const saved = [];
        service.findByUUID = jest.fn((uuid) => rows.find((row) => row.uuid === uuid));
        service.get = jest.fn((entityName, entityTypeUuid) => rows.find((row) => row.entityName === entityName && row.entityTypeUuid === entityTypeUuid));
        service.saveOrUpdate = jest.fn((status) => saved.push(status));
        return {service, saved};
    }

    const stored = {uuid: 's1', entityName: 'Encounter', entityTypeUuid: 'et-1', loadedSince: new Date(GROUP_TIME), lastUuid: 'last-row'};

    it('keeps lastUuid when the sync details repeat the same loadedSince', () => {
        const {service, saved} = serviceHolding([stored]);
        service.updateAsPerSyncDetails([{uuid: 's1', entityName: 'Encounter', entityTypeUuid: 'et-1', loadedSince: GROUP_TIME}]);
        expect(saved[0].lastUuid).toBe('last-row');
    });

    it('clears lastUuid when loadedSince is reset', () => {
        const {service, saved} = serviceHolding([stored]);
        service.updateAsPerSyncDetails([{uuid: 's1', entityName: 'Encounter', entityTypeUuid: 'et-1', loadedSince: EntitySyncStatus.REALLY_OLD_DATE}]);
        expect(saved[0].lastUuid).toBeNull();
        expect(saved[0].loadedSince).toEqual(EntitySyncStatus.REALLY_OLD_DATE);
    });

    it('starts a new checkpoint with no cursor', () => {
        const {service, saved} = serviceHolding([]);
        service.updateAsPerSyncDetails([{uuid: 's9', entityName: 'Encounter', entityTypeUuid: 'et-9', loadedSince: GROUP_TIME}]);
        expect(saved[0].lastUuid).toBeNull();
    });

    it('gives the pull the cursor only for the loadedSince it was stored with', () => {
        const {service} = serviceHolding([stored]);
        expect(service.lastUuidFor({entityName: 'Encounter', entityTypeUuid: 'et-1', loadedSince: GROUP_TIME})).toBe('last-row');
        expect(service.lastUuidFor({entityName: 'Encounter', entityTypeUuid: 'et-1', loadedSince: EARLIER})).toBeNull();
        expect(service.lastUuidFor({entityName: 'Encounter', entityTypeUuid: 'et-2', loadedSince: GROUP_TIME})).toBeNull();
    });
});
