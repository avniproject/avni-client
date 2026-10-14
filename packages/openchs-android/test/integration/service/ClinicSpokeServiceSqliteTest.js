/**
 * Phones syncing through a real hub over the real transport. Records live in small in-memory
 * stores per phone; the per-type record adapters are tested separately.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ClinicSpokeServiceSqliteTest
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
import ClinicSpokeService from "../../../src/service/clinicsharing/ClinicSpokeService";
import ClinicRecordService from "../../../src/service/clinicsharing/ClinicRecordService";

let dbCount = 0;
let nextPort = 18100 + (process.pid % 500);
const uniqueName = (kind) => `clinic_${kind}_test_${process.pid}_${dbCount++}.db`;

// One phone's records, upload queue and record service.
function device() {
    const records = {};
    const queue = [];
    let clock = Date.now();
    const recordService = {
        applied: [],
        toSharedResource: (entityName, entity) => entity.toResource,
        applyBatches: async (batches) => {
            batches.forEach(({entityName, resources}) => resources.forEach((r) => { records[r.uuid] = {entityName, version: r.version}; }));
            recordService.applied.push(batches);
            return batches.reduce((n, b) => n + b.resources.length, 0);
        },
    };
    return {
        records, queue, recordService,
        save(entityName, uuid, version) {
            records[uuid] = {entityName, version};
            queue.push({entity: entityName, entityUUID: uuid, savedAt: new Date(++clock)});
        },
        stub(service) {
            service.findAll = () => queue;
            service.findByKey = (key, uuid) => records[uuid] && {toResource: {uuid, version: records[uuid].version}};
            service.getService = (cls) => (cls === ClinicRecordService ? recordService : undefined);
            service.dispatchAction = jest.fn();
            return service;
        },
    };
}

describe('Phones syncing with the hub', () => {
    let hubDevice, hub, session, port, phones;
    const log = () => {};

    async function startHub() {
        session = await hub.startHub(log, {port});
        return session;
    }

    function phone() {
        const d = device();
        const spoke = d.stub(new ClinicSpokeService({}, {}));
        spoke.stateName = uniqueName('spoke');
        const p = {...d, spoke, sync: () => spoke.syncWithHub({host: '127.0.0.1', port, ...session}, log)};
        phones.push(p);
        return p;
    }

    beforeEach(async () => {
        phones = [];
        port = nextPort++;
        hubDevice = device();
        hub = hubDevice.stub(new ClinicHubService({}, {}));
        hub.ledgerName = uniqueName('hub');
        await startHub();
    });

    afterEach(async () => {
        await hub.stopHub();
        (await hub._ledger()).close();
        for (const p of phones) (await p.spoke._state()).close();
    });

    it("carries a record from one phone to another, and leaves the sender's upload queue alone", async () => {
        const a = phone(), b = phone();
        a.save('Individual', 'ind-1', 'a1');

        await a.sync();
        await b.sync();

        expect(b.records['ind-1']).toEqual({entityName: 'Individual', version: 'a1'});
        expect(a.queue).toHaveLength(1);
    });

    it('sends only what was saved since the last acknowledged send, including a record edited again', async () => {
        const a = phone();
        a.save('Individual', 'ind-1', 'v1');
        a.save('Encounter', 'enc-1', 'v1');
        await a.sync();
        const pushes = jest.spyOn(hub, '_handlePush');

        await a.sync();
        a.save('Individual', 'ind-1', 'v2');
        await a.sync();

        const sent = pushes.mock.calls.map(([message]) => message.batches.flatMap((batch) => batch.resources.map((r) => `${r.uuid}@${r.version}`)));
        expect(sent).toEqual([[], ['ind-1@v2']]);
    });

    it('never sends record types that are not shared, such as identifier assignments', async () => {
        const a = phone(), b = phone();
        a.save('IdentifierAssignment', 'id-1', 'v1');
        a.save('Individual', 'ind-1', 'v1');

        await a.sync();
        await b.sync();

        expect(Object.keys(b.records)).toEqual(['ind-1']);
    });

    it('leaves both phones with the version that reached the hub last, in either order', async () => {
        for (const [first, second] of [['a', 'b'], ['b', 'a']]) {
            const p = {a: phone(), b: phone()};
            p.a.save('Encounter', `enc-${first}`, 'from-a');
            p.b.save('Encounter', `enc-${first}`, 'from-b');

            await p[first].sync();
            await p[second].sync();
            await p[first].sync();

            const winner = `from-${second}`;
            expect([p.a.records[`enc-${first}`].version, p.b.records[`enc-${first}`].version]).toEqual([winner, winner]);
        }
    });

    it('after a hub restart, sends everything unsent again and pulls from the start, without duplicates', async () => {
        const a = phone(), b = phone();
        a.save('Individual', 'ind-1', 'v1');
        await a.sync();
        await b.sync();

        await hub.stopHub();
        await startHub();
        const pushes = jest.spyOn(hub, '_handlePush');
        await a.sync();
        await b.sync();

        expect(pushes.mock.calls[0][0].batches.flatMap((batch) => batch.resources.map((r) => r.uuid))).toEqual(['ind-1']);
        expect(Object.keys(b.records)).toEqual(['ind-1']);
        const db = await hub._ledger();
        const rows = hub._sqliteRows(await db.execute("select count(distinct entity_uuid) as n from ledger"));
        expect(rows[0].n).toBe(1);
    });

    it('gives a phone that joins late everything the hub still holds', async () => {
        const a = phone();
        a.save('Individual', 'ind-1', 'v1');
        a.save('Encounter', 'enc-1', 'v1');
        await a.sync();

        const late = phone();
        await late.sync();

        expect(Object.keys(late.records).sort()).toEqual(['enc-1', 'ind-1']);
    });

    it('refreshes open lists only when something arrived', async () => {
        const a = phone(), b = phone();
        await b.sync();
        expect(b.spoke.dispatchAction).not.toHaveBeenCalled();

        a.save('Individual', 'ind-1', 'v1');
        await a.sync();
        await b.sync();
        expect(b.spoke.dispatchAction).toHaveBeenCalled();
    });
});
