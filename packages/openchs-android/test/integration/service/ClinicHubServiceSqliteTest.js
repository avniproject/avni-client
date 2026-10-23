/**
 * The hub's record of what the clinic has shared: what goes in, what each phone gets back,
 * and that two pushes at once never interleave.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ClinicHubServiceSqliteTest
 */
jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock('react-native-libsodium', () => require('libsodium-wrappers'));
jest.mock('react-native-tcp-socket', () => require('net'));
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));

import ClinicHubService from "../../../src/service/clinicsharing/ClinicHubService";
import ClinicRecordService from "../../../src/service/clinicsharing/ClinicRecordService";

const DAY_MS = 24 * 60 * 60 * 1000;
let ledgerCount = 0;

describe("Clinic hub ledger", () => {
    let hub, applied, ownQueue, stored;
    const log = () => {};

    beforeEach(() => {
        applied = [];
        ownQueue = [];
        stored = {};
        const p2p = {applyBatches: async (batches) => { applied.push(batches); return batches.length; }, toSharedResource: (entityName, entity) => entity.toResource, setupVersion: () => ({Form: 1})};
        hub = new ClinicHubService({}, {getService: (cls) => (cls === ClinicRecordService ? p2p : {discardStrayParts: async () => {}, afterSync: async () => 0})});
        hub.ledgerName = `clinic_hub_ledger_test_${process.pid}_${ledgerCount++}.db`;
        hub.findAll = () => ownQueue;
        hub.findByKey = (key, uuid, entityName) => stored[uuid] && {toResource: {uuid, entityName, version: stored[uuid]}};
    });

    afterEach(async () => {
        const db = await hub._ledger();
        db.close();
    });

    const push = (deviceId, entityName, uuids, upTo = 1) => hub._handleMessage({type: 'push', deviceId, upTo, batches: [{entityName, resources: uuids.map((uuid) => ({uuid}))}]}, log);
    const pull = (deviceId, since = 0) => hub._handleMessage({type: 'pull', deviceId, since}, log);
    const uuidsIn = (reply) => reply.batches.flatMap((b) => b.resources.map((r) => r.uuid));

    it('applies a push, then records it, and acknowledges up to what the phone sent', async () => {
        stored['ind-1'] = 1;

        const reply = await push('phone-a', 'Individual', ['ind-1'], 17);

        expect(reply).toEqual({type: 'pushAck', upTo: 17, applied: 1});
        expect(applied).toHaveLength(1);
        expect(uuidsIn(await pull('phone-b'))).toEqual(['ind-1']);
    });

    it('never interleaves two pushes that arrive at the same moment', async () => {
        const events = [];
        hub.getService = () => ({
            cleanUpCopies: async () => 0,
            afterSync: async () => 0,
            applyBatches: async (batches) => {
                const uuid = batches[0].resources[0].uuid;
                events.push(`apply ${uuid} start`);
                await new Promise((r) => setTimeout(r, uuid === 'a' ? 30 : 1));
                events.push(`apply ${uuid} end`);
                return 1;
            },
        });
        const originalAppend = hub._appendLedgerRows.bind(hub);
        hub._appendLedgerRows = async (...args) => { events.push(`ledger ${args[0][0].resources[0].uuid}`); return originalAppend(...args); };

        await Promise.all([push('phone-a', 'Individual', ['a']), push('phone-b', 'Individual', ['b'])]);

        expect(events).toEqual(['apply a start', 'apply a end', 'ledger a', 'apply b start', 'apply b end', 'ledger b']);
    });

    it('serves the latest version of each record, and nothing the asking phone itself sent last', async () => {
        stored['enc-1'] = 2;
        stored['ind-1'] = 1;
        await push('phone-a', 'Encounter', ['enc-1']);
        await push('phone-b', 'Encounter', ['enc-1']);
        await push('phone-a', 'Individual', ['ind-1']);

        expect(uuidsIn(await pull('phone-b'))).toEqual(['ind-1']);
        expect(uuidsIn(await pull('phone-a'))).toEqual(['enc-1']);
        expect(uuidsIn(await pull('phone-c'))).toEqual(['ind-1', 'enc-1']);
    });

    it('serves parents before children, from the asking phone\'s cursor, with the hub epoch', async () => {
        stored['enc-1'] = 1;
        stored['ind-1'] = 1;
        stored['ind-2'] = 1;
        await push('phone-a', 'Individual', ['ind-1']);
        const {maxSeq: cursor} = await pull('phone-b');
        await push('phone-a', 'Encounter', ['enc-1']);
        await push('phone-a', 'Individual', ['ind-2']);

        const reply = await pull('phone-b', cursor);

        expect(reply.batches.map((b) => b.entityName)).toEqual(['Individual', 'Encounter']);
        expect(uuidsIn(reply)).toEqual(['ind-2', 'enc-1']);
        expect(reply.maxSeq).toBeGreaterThan(cursor);
        expect(reply.epoch).toBe(await hub._getMeta('epoch'));
    });

    it('still serves the other records when one cannot be read, as a record saved without its parent cannot', async () => {
        stored['ind-1'] = 1;
        stored['enc-broken'] = 1;
        await push('phone-a', 'Individual', ['ind-1']);
        await push('phone-a', 'Encounter', ['enc-broken']);
        const readable = hub.findByKey;
        hub.findByKey = (key, uuid, entityName) => (uuid === 'enc-broken'
            ? {uuid, get toResource() { throw new TypeError("Cannot read properties of null (reading 'uuid')"); }}
            : readable(key, uuid, entityName));

        expect(uuidsIn(await pull('phone-b'))).toEqual(['ind-1']);
    });

    it("shares records the hub's own user saved", async () => {
        stored['ind-own'] = 1;
        ownQueue = [{entity: 'Individual', entityUUID: 'ind-own', savedAt: new Date()}];

        expect(uuidsIn(await pull('phone-a'))).toEqual(['ind-own']);
        expect(uuidsIn(await pull('phone-a'))).toEqual(['ind-own']);
        const db = await hub._ledger();
        const rows = hub._sqliteRows(await db.execute('select origin from ledger'));
        expect(rows).toEqual([{origin: await hub.hubId()}]);
    });

    it("shares the hub's own saves even after its clock is set back", async () => {
        stored['ind-own'] = 1;
        stored['enc-own'] = 1;
        ownQueue = [{entity: 'Individual', entityUUID: 'ind-own', savedAt: new Date('2026-10-15T12:00:00Z')}];
        await pull('phone-a');

        ownQueue.push({entity: 'Encounter', entityUUID: 'enc-own', savedAt: new Date('2026-10-15T11:00:00Z')});

        expect(uuidsIn(await pull('phone-a'))).toEqual(['ind-own', 'enc-own']);
    });

    it("answers that a phone that has never been a hub is not in a camp, without creating a hub file", async () => {
        hub._hasLedger = async () => false;
        const ledger = jest.spyOn(hub, '_ledger');

        expect(await hub.campActive()).toBe(false);
        expect(ledger).not.toHaveBeenCalled();
    });

    it('keeps everything it shared for the whole camp, however long ago it arrived', async () => {
        stored['day-one'] = 1;
        await push('phone-a', 'Individual', ['day-one']);
        const db = await hub._ledger();
        await db.execute("update ledger set created_at = ? where entity_uuid = 'day-one'", [Date.now() - 10 * DAY_MS]);

        expect(uuidsIn(await pull('phone-joining-late'))).toEqual(['day-one']);
    });

    it('keeps its hub id but takes a new epoch every time it starts outside a camp', async () => {
        const hubId = await hub.hubId();
        const first = await hub._beginSession();
        const second = await hub._beginSession();

        expect(first.hubId).toBe(hubId);
        expect(second.hubId).toBe(hubId);
        expect(second.epoch).not.toBe(first.epoch);
        expect(second.key).not.toBe(first.key);
    });

    // Phones holding the same epoch keep their place, so nobody sends or fetches everything again after a restart.
    it('keeps its epoch across restarts within a camp, changing only the key', async () => {
        const first = await hub._beginSession();
        await hub._setMeta('campActive', true);
        const restarted = await hub._beginSession();

        expect(restarted.epoch).toBe(first.epoch);
        expect(restarted.key).not.toBe(first.key);
    });
});
