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

jest.mock('../../../src/framework/clinicsharing/ClinicHubJoin', () => ({
    __esModule: true,
    default: {joinHub: jest.fn(), watchHubNetwork: jest.fn(() => jest.fn()), startHubNetwork: jest.fn(), stopHubNetwork: jest.fn(async () => {})},
}));
jest.mock('../../../src/framework/clinicsharing/ClinicHubWifi', () => ({leaveNetwork: jest.fn(async () => {}), onHotspotStopped: jest.fn(() => jest.fn())}));

import hubJoin from "../../../src/framework/clinicsharing/ClinicHubJoin";
import ClinicHubService from "../../../src/service/clinicsharing/ClinicHubService";
import ClinicSpokeService from "../../../src/service/clinicsharing/ClinicSpokeService";
import ClinicRecordService from "../../../src/service/clinicsharing/ClinicRecordService";
import UserInfoService from "../../../src/service/UserInfoService";
import {MyDashboardActionNames} from "../../../src/action/mydashboard/MyDashboardActions";

let dbCount = 0;
let nextPort = 18100 + (process.pid % 500);
const uniqueName = (kind) => `clinic_${kind}_test_${process.pid}_${dbCount++}.db`;

// One phone's records, upload queue and record service.
function device() {
    const records = {};
    const queue = [];
    const parkedRecords = {afterSync: async () => ({applied: 0, reported: 0})};
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
        records, queue, recordService, parkedRecords,
        save(entityName, uuid, version) {
            records[uuid] = {entityName, version};
            queue.push({entity: entityName, entityUUID: uuid, savedAt: new Date(++clock)});
        },
        stub(service) {
            service.findAll = () => queue;
            service.findByKey = (key, uuid) => records[uuid] && {toResource: {uuid, version: records[uuid].version}};
            const clinic = {clinicMediaService: {pushToHub: async () => 0, cleanUpCopies: async () => 0}, clinicParkedRecordService: parkedRecords};
            const userInfo = {getUserSettings: () => ({disableAutoRefresh: false})};
            service.getService = (cls) => (cls === ClinicRecordService ? recordService : cls === UserInfoService ? userInfo : clinic[cls]);
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

    function phone(name = 'Nurse · Pixel 9a') {
        const d = device();
        const spoke = d.stub(new ClinicSpokeService({}, {}));
        spoke.stateName = uniqueName('spoke');
        spoke.phoneName = () => name;
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

    it("recounts the home dashboard only when something arrived, without moving the user off a search", async () => {
        const a = phone(), b = phone();
        await b.sync();
        expect(b.spoke.dispatchAction).not.toHaveBeenCalled();

        a.save('Individual', 'ind-1', 'v1');
        await a.sync();
        await b.sync();
        expect(b.spoke.dispatchAction.mock.calls).toEqual([[MyDashboardActionNames.ON_LOAD, {fetchFromDB: true}]]);
    });

    it("sends a save made after the phone's clock was set back", async () => {
        const a = phone(), b = phone();
        a.records['ind-1'] = {entityName: 'Individual', version: 'v1'};
        a.queue.push({entity: 'Individual', entityUUID: 'ind-1', savedAt: new Date('2026-10-15T12:00:00Z')});
        await a.sync();

        a.records['enc-1'] = {entityName: 'Encounter', version: 'v1'};
        a.queue.push({entity: 'Encounter', entityUUID: 'enc-1', savedAt: new Date('2026-10-15T11:00:00Z')});
        await a.sync();
        await b.sync();

        expect(Object.keys(b.records).sort()).toEqual(['enc-1', 'ind-1']);
    });

    it("keeps an edit saved during a sync, rather than overwriting it with the peer's copy that sync pulls", async () => {
        const a = phone(), b = phone();
        b.save('Individual', 'ind-1', 'b1');
        await b.sync();
        a.records['ind-1'] = {entityName: 'Individual', version: 'a0'};
        const collect = a.spoke.collectOutbox.bind(a.spoke);
        a.spoke.collectOutbox = (pushed) => {
            const outbox = collect(pushed);
            a.records['ind-1'] = {entityName: 'Individual', version: 'a-edit'};
            a.queue.push({entity: 'Individual', entityUUID: 'ind-1', savedAt: new Date(Date.now() + 1)});
            return outbox;
        };

        await a.sync();
        expect(a.records['ind-1'].version).toBe('a-edit');

        a.spoke.collectOutbox = collect;
        await a.sync();
        await b.sync();
        expect(b.records['ind-1'].version).toBe('a-edit');
    });

    it('pulls everything again after its clinic state is cleared, as on a change of user', async () => {
        const a = phone(), b = phone();
        a.save('Individual', 'ind-1', 'v1');
        await a.sync();
        await b.sync();
        b.recordService.applied.length = 0;

        await b.spoke.clearState();
        await b.sync();

        expect(b.recordService.applied.flatMap((batches) => batches.flatMap((batch) => batch.resources.map((r) => r.uuid)))).toEqual(['ind-1']);
    });

    it('refreshes open lists when a record that waited for its parent is applied after the sync', async () => {
        const b = phone();
        b.parkedRecords.afterSync = async () => ({applied: 1, reported: 0});

        await b.sync();

        expect(b.spoke.dispatchAction).toHaveBeenCalled();
    });

    describe('joining from the screen', () => {
        const code = 'scanned-code';
        const joinWith = (p) => {
            hubJoin.joinHub.mockImplementation(async () => ({host: '127.0.0.1', port, ...session, ssid: 'AndroidShare_1'}));
            return p.spoke.joinWithCode(code, log);
        };
        const settled = (p) => p.spoke.inFlight || Promise.resolve();
        afterEach(() => phones.forEach((p) => p.spoke.leave()));

        it('remembers the scanned code for Rejoin, records the sync, and forgets the code on leaving', async () => {
            const a = phone();
            await joinWith(a);
            await settled(a);

            expect([await a.spoke.savedJoinCode(), a.spoke.joined.ssid, a.spoke.lastSyncedAt instanceof Date]).toEqual([code, 'AndroidShare_1', true]);

            await a.spoke.leaveHub();
            expect([await a.spoke.savedJoinCode(), a.spoke.joined]).toEqual([null, null]);
        });

        it("keeps the code for Rejoin when the phone loses the hub's Wi-Fi", async () => {
            const a = phone();
            let lost;
            hubJoin.watchHubNetwork.mockImplementation((info, onLost) => { lost = onLost; return jest.fn(); });
            await joinWith(a);
            await settled(a);

            lost();

            expect([a.spoke.hubNetworkLost, a.spoke.joined, await a.spoke.savedJoinCode()]).toEqual([true, null, code]);
        });

        it('asks for a new scan when the hub restarted with a new code, and keeps the last good sync time', async () => {
            const a = phone();
            await joinWith(a);
            await settled(a);
            const lastGood = a.spoke.lastSyncedAt;
            await hub.stopHub();
            await startHub();

            await a.spoke.syncNow(log);

            expect([a.spoke.hubRestarted, a.spoke.joined, await a.spoke.savedJoinCode(), a.spoke.lastSyncedAt]).toEqual([true, null, null, lastGood]);
            expect(a.spoke.lastSync.error.code).toBe('key');
        });
    });

    describe('the hub screen', () => {
        it('counts the phones that synced in the last 5 minutes', async () => {
            const a = phone(), b = phone(), c = phone();
            await a.sync();
            await b.sync();
            await c.sync();
            const [first] = hub.lastSyncByDevice.keys();
            hub.lastSyncByDevice.set(first, {...hub.lastSyncByDevice.get(first), syncedAt: Date.now() - 6 * 60 * 1000});

            expect(hub.recentPhoneCount()).toBe(2);
        });

        it("lists each phone by its user and model with when it last synced, newest first, including one that has gone quiet", async () => {
            const nurse = phone('Nurse · Pixel 9a'), doctor = phone('Doctor · Galaxy A15');
            await nurse.sync();
            await doctor.sync();
            const [nurseId, doctorId] = hub.lastSyncByDevice.keys();
            hub.lastSyncByDevice.set(nurseId, {...hub.lastSyncByDevice.get(nurseId), syncedAt: Date.now() - 20 * 60 * 1000});

            expect(hub.phonesSynced().map(({name}) => name)).toEqual(['Doctor · Galaxy A15', 'Nurse · Pixel 9a']);
            expect(hub.phonesSynced()[0].syncedAt).toBe(hub.lastSyncByDevice.get(doctorId).syncedAt);
        });

        it('stops its server again when the hotspot cannot start', async () => {
            await hub.stopHub();
            hubJoin.startHubNetwork.mockImplementation(async () => { throw new Error('Wi-Fi is off'); });

            await expect(hub.startSharing(log, {port})).rejects.toThrow('Wi-Fi is off');
            expect([hub.transport, hub.getSharing()]).toEqual([null, null]);
        });

        it('starts and stops the hotspot with its server', async () => {
            await hub.stopHub();
            hubJoin.startHubNetwork.mockImplementation(async ({hubId}) => ({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: hubId}));

            const sharing = await hub.startSharing(log, {port});
            expect([sharing.ssid, sharing.qrValue, hub.transport !== null]).toEqual(['AndroidShare_1', await hub.hubId(), true]);

            await hub.stopSharing();
            expect([hub.transport, hub.getSharing(), hubJoin.stopHubNetwork.mock.calls.length]).toEqual([null, null, 1]);
        });
    });
});
