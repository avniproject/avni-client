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

import {DeviceEventEmitter, NativeModules} from "react-native";
import hubJoin from "../../../src/framework/clinicsharing/ClinicHubJoin";
import {onHotspotStopped} from "../../../src/framework/clinicsharing/ClinicHubWifi";
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
        setup: {Form: 100, Concept: 50},
        setupVersion: () => recordService.setup,
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
            const clinic = {clinicMediaService: {pushToHub: async () => 0, discardStrayParts: async () => {}, discardFetchedCopies: async () => {}, discardHubCopies: async () => {}}, clinicParkedRecordService: parkedRecords,
                clinicSpokeService: {camp: async () => null, leaveCamp: async () => {}}, clinicHubService: {campActive: async () => false}};
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

    it('after a hub restart within a camp, phones carry on from where they were: nothing is sent or fetched again', async () => {
        await hub._setMeta('campActive', true);
        await hub.stopHub();
        await startHub();
        const a = phone(), b = phone();
        a.save('Individual', 'ind-1', 'v1');
        await a.sync();
        await b.sync();
        const epochBefore = session.epoch;

        await hub.stopHub();
        await startHub();
        const pushes = jest.spyOn(hub, '_handlePush');
        const pulls = jest.spyOn(hub, '_handlePull');
        b.recordService.applied.length = 0;
        await a.sync();
        await b.sync();

        expect(session.epoch).toBe(epochBefore);
        expect(pushes.mock.calls.map(([message]) => message.batches.length)).toEqual([0, 0]);
        expect(pulls.mock.calls.every(([message]) => message.since > 0)).toBe(true);
        expect(b.recordService.applied.flat()).toEqual([]);
    });

    it('after a hub restart outside a camp, sends everything unsent again and pulls from the start, without duplicates', async () => {
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
        expect(b.spoke.dispatchAction.mock.calls).toEqual([[MyDashboardActionNames.ON_RECOUNT, {fetchFromDB: true}]]);
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

    // A start taken after the pull would hold back the report on a record this pull failed to bring the parent of.
    it("checks records waiting for a parent against a start taken before the pull", async () => {
        const b = phone();
        let pulledAt, checkedWithStart;
        const apply = b.recordService.applyBatches;
        b.recordService.applyBatches = async (batches) => { pulledAt = Date.now(); return apply(batches); };
        b.parkedRecords.afterSync = async (syncStartedAt) => { checkedWithStart = syncStartedAt; return {applied: 0, reported: 0}; };
        let clock = Date.now();
        const now = jest.spyOn(Date, 'now').mockImplementation(() => clock++);

        try {
            await b.sync();
        } finally {
            now.mockRestore();
        }

        expect(checkedWithStart).toBeLessThan(pulledAt);
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

        describe('with the native clinic service', () => {
            let native;
            beforeEach(() => {
                native = {startForegroundService: jest.fn(), stopForegroundService: jest.fn(), addListener: jest.fn(), removeListeners: jest.fn()};
                NativeModules.ClinicHub = native;
            });
            afterEach(() => { delete NativeModules.ClinicHub; });

            // Android withdraws a camera allowed "Only this time" by killing the app, unless a foreground service started on screen is running.
            it('keeps a joined-phone service running while joined, and stops only that role on leaving', async () => {
                const a = phone();
                await joinWith(a);
                await settled(a);
                expect(native.startForegroundService.mock.calls).toEqual([['phone']]);

                await a.spoke.leaveHub();
                expect(native.stopForegroundService).toHaveBeenLastCalledWith('phone');
            });

            it("leaves the camp when Leave camp is tapped on the phone's notification, after a last sync with the hub", async () => {
                const a = phone();
                await joinWith(a);
                await settled(a);
                a.save('Individual', 'ind-last', 'v1');
                const left = new Promise((resolve) => a.spoke.onChange(() => !a.spoke.joined && resolve()));

                DeviceEventEmitter.emit('ClinicPhoneLeaveRequested');
                await left;
                await new Promise((resolve) => setImmediate(resolve));

                expect([a.spoke.joined, await a.spoke.savedJoinCode(), await a.spoke.camp()]).toEqual([null, null, null]);
                expect(hubDevice.records['ind-last']).toEqual({entityName: 'Individual', version: 'v1'});
            });
        });

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

        describe('in a camp', () => {
            it("puts a phone in the camp when it joins, and keeps it there when it loses the hub's Wi-Fi or the hub restarts", async () => {
                const a = phone(), b = phone();
                let lost;
                hubJoin.watchHubNetwork.mockImplementation((info, onLost) => { lost = onLost; return jest.fn(); });
                await joinWith(b);
                await settled(b);
                lost();
                expect([b.spoke.joined, await b.spoke.isInCamp()]).toEqual([null, true]);

                await joinWith(a);
                await settled(a);
                expect(await a.spoke.camp()).toEqual({hubId: session.hubId, epoch: session.epoch});
                await hub.stopHub();
                await startHub();
                await a.spoke.syncNow(log);

                expect([a.spoke.hubRestarted, await a.spoke.isInCamp()]).toEqual([true, true]);
            });

            it("refuses a phone whose organisation setup differs, takes none of its records, and the phone leaves the camp saying which types", async () => {
                const a = phone();
                a.recordService.setup = {Form: 999, Concept: 50};
                a.save('Individual', 'ind-1', 'v1');

                await joinWith(a);
                await settled(a);

                expect(a.spoke.leftCamp).toMatchObject({code: 'setup', details: {types: ['Form']}});
                expect([await a.spoke.camp(), a.spoke.joined]).toEqual([null, null]);
                expect(hubDevice.records['ind-1']).toBeUndefined();
            });

            it("on End camp, each phone sends and fetches once more and leaves; the hub lists who has left and lets it close once the rest are skipped", async () => {
                const a = phone('Nurse'), b = phone('Doctor');
                await joinWith(a);
                await settled(a);
                await b.sync();
                b.save('Individual', 'ind-b', 'v1');
                await b.sync();

                await hub.endCamp();
                a.save('Encounter', 'enc-a', 'v1');
                await a.spoke.syncNow(log);

                expect(hubDevice.records['enc-a']).toEqual({entityName: 'Encounter', version: 'v1'});
                expect(a.records['ind-b']).toEqual({entityName: 'Individual', version: 'v1'});
                expect([await a.spoke.camp(), a.spoke.joined, a.spoke.leftCamp]).toEqual([null, null, {code: 'campEnded'}]);
                const status = Object.fromEntries(hub.phonesSynced().map(({name, leftAt, skipped}) => [name, leftAt ? 'left' : skipped ? 'skipped' : 'in camp']));
                expect(status).toEqual({Nurse: 'left', Doctor: 'in camp'});
                expect(hub.everyPhoneLeft()).toBe(false);

                const doctor = hub.phonesSynced().find(({name}) => name === 'Doctor');
                await hub.skipPhone(doctor.deviceId);
                expect(hub.everyPhoneLeft()).toBe(true);
            });

            it("on End camp, a phone whose last photo send fails still leaves, as the hub already lists it as left", async () => {
                const a = phone('Nurse');
                await joinWith(a);
                await settled(a);
                a.spoke.getService('clinicMediaService').pushToHub = async () => { throw new Error('The hub closed the connection.'); };

                await hub.endCamp();
                await a.spoke.syncNow(log);

                expect(hub.phonesSynced().find(({name}) => name === 'Nurse').leftAt).toBeTruthy();
                expect([await a.spoke.camp(), a.spoke.joined, a.spoke.leftCamp]).toEqual([null, null, {code: 'campEnded'}]);
            });
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

        it("does not list a phone as synced when the hub could not keep its records", async () => {
            const nurse = phone('Nurse · Pixel 9a');
            nurse.save('Individual', 'ind-1', 'v1');
            hubDevice.recordService.applyBatches = async () => { throw new Error('disk full'); };

            await nurse.sync();

            expect(hub.phonesSynced()).toEqual([]);
        });

        it("does not list a phone as synced when the hub could not build what it pulls", async () => {
            hub._mirrorOwnQueue = async () => { throw new Error('disk full'); };

            await expect(hub._handlePull({deviceId: 'device-1', phoneName: 'Nurse · Pixel 9a', since: 0}, log)).rejects.toThrow('disk full');

            expect(hub.phonesSynced()).toEqual([]);
        });

        it('stops its server again when the hotspot cannot start', async () => {
            await hub.stopHub();
            hubJoin.startHubNetwork.mockImplementation(async () => { throw new Error('Wi-Fi is off'); });

            await expect(hub.startSharing(log, {port})).rejects.toThrow('Wi-Fi is off');
            expect([hub.transport, hub.getSharing()]).toEqual([null, null]);
        });

        it('starts and stops the hotspot with its server', async () => {
            await hub.stopHub();
            hubJoin.stopHubNetwork.mockClear();
            hubJoin.startHubNetwork.mockImplementation(async ({hubId}) => ({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: hubId}));

            const sharing = await hub.startSharing(log, {port});
            expect([sharing.ssid, sharing.qrValue, hub.transport !== null]).toEqual(['AndroidShare_1', await hub.hubId(), true]);

            await hub.stopSharing();
            expect([hub.transport, hub.getSharing(), hubJoin.stopHubNetwork.mock.calls.length]).toEqual([null, null, 1]);
        });

        it("runs one start at a time, so the automatic restart and a tap on Start hub share it", async () => {
            await hub.stopHub();
            hubJoin.startHubNetwork.mockClear();
            let finish = null;
            hubJoin.startHubNetwork.mockImplementation(({hubId}) => new Promise((resolve) => { finish = () => resolve({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: hubId}); }));

            const restart = hub.startSharing(log, {port});
            const tap = hub.startSharing(log, {port});
            expect(hub.isStarting()).toBe(true);
            while (!finish) await new Promise((resolve) => setTimeout(resolve, 5));
            finish();

            const [first, second] = await Promise.all([restart, tap]);
            expect(second).toBe(first);
            expect([hubJoin.startHubNetwork.mock.calls.length, hub.isStarting(), hub.transport !== null]).toEqual([1, false, true]);
        });

        it("waits for a start under way before closing the camp, so the camp does not come back on", async () => {
            await hub.stopHub();
            let finish = null;
            hubJoin.startHubNetwork.mockImplementation(({hubId}) => new Promise((resolve) => { finish = () => resolve({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: hubId}); }));

            const restart = hub.startSharing(log, {port});
            const closing = hub.closeCamp();
            while (!finish) await new Promise((resolve) => setTimeout(resolve, 5));
            finish();
            await Promise.all([restart, closing]);

            expect([await hub.campActive(), hub.getSharing(), hub.transport]).toEqual([false, null, null]);
        });

        it("keeps its list of phones and who has left across a restart within a camp", async () => {
            await hub.stopHub();
            hubJoin.startHubNetwork.mockImplementation(async ({hubId}) => ({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: hubId}));
            await hub.startSharing(log, {port});
            await hub._noteSync('device-nurse', 'Nurse');
            await hub._noteSync('device-doctor', 'Doctor');
            await hub.skipPhone('device-doctor');

            await hub.stopSharing();
            // A restart is a new app process, which remembers nothing but the hub file.
            hub.lastSyncByDevice.clear();
            hub.campPhones.clear();
            await hub.startSharing(log, {port});

            expect(hub.phonesSynced().map(({name, skipped}) => `${name}${skipped ? ' (skipped)' : ''}`).sort()).toEqual(['Doctor (skipped)', 'Nurse']);
        });

        it("is in its own camp from Start hub until the camp is closed, even while the hub is stopped", async () => {
            await hub.stopHub();
            hubJoin.startHubNetwork.mockImplementation(async ({hubId}) => ({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: hubId}));

            await hub.startSharing(log, {port});
            expect(await hub.campActive()).toBe(true);
            await hub.stopSharing();
            expect(await hub.campActive()).toBe(true);

            await hub.closeCamp();
            expect([await hub.campActive(), hub.campEnding, hub.phonesSynced()]).toEqual([false, false, []]);
        });

        it('fails the start instead of showing a code when the hotspot stops while starting', async () => {
            await hub.stopHub();
            hubJoin.stopHubNetwork.mockClear();
            const stopListening = jest.fn();
            onHotspotStopped.mockImplementationOnce((listener) => {
                hubJoin.startHubNetwork.mockImplementationOnce(async () => { listener({reason: 'stopped'}); return {ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: 'x'}; });
                return stopListening;
            });

            await expect(hub.startSharing(log, {port})).rejects.toMatchObject({code: 'hotspotStopped'});
            expect([hub.transport, hub.getSharing(), stopListening.mock.calls.length, hubJoin.stopHubNetwork.mock.calls.length]).toEqual([null, null, 1, 1]);
        });

        it('stops sharing when the hotspot stops after it started', async () => {
            await hub.stopHub();
            let hotspotStopped;
            onHotspotStopped.mockImplementationOnce((listener) => { hotspotStopped = listener; return jest.fn(); });
            hubJoin.startHubNetwork.mockImplementationOnce(async () => ({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: 'x'}));

            await hub.startSharing(log, {port});
            await hotspotStopped({reason: 'stopped'});
            await new Promise((resolve) => setImmediate(resolve));
            expect([hub.transport, hub.getSharing()]).toEqual([null, null]);
        });

        it('says why it stopped when the hotspot stops after it started, until the next start', async () => {
            await hub.stopHub();
            let hotspotStopped;
            onHotspotStopped.mockImplementationOnce((listener) => { hotspotStopped = listener; return jest.fn(); });
            hubJoin.startHubNetwork.mockImplementation(async () => ({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: 'x'}));

            await hub.startSharing(log, {port});
            expect(hub.hotspotStopped).toBe(false);
            await hotspotStopped({reason: 'stopped'});
            await new Promise((resolve) => setImmediate(resolve));
            expect(hub.hotspotStopped).toBe(true);

            await hub.startSharing(log, {port});
            expect(hub.hotspotStopped).toBe(false);
            await hub.stopSharing();
        });

        it('stopping the hub on purpose is not reported as the hotspot stopping', async () => {
            await hub.stopHub();
            hubJoin.startHubNetwork.mockImplementation(async () => ({ssid: 'AndroidShare_1', passphrase: 'pass1234', qrValue: 'x'}));

            await hub.startSharing(log, {port});
            await hub.stopSharing();

            expect(hub.hotspotStopped).toBe(false);
        });

        it("runs the native service in the hub's role, and stops only that role", async () => {
            const native = {startForegroundService: jest.fn(), stopForegroundService: jest.fn(), addListener: jest.fn(), removeListeners: jest.fn()};
            NativeModules.ClinicHub = native;
            try {
                await hub.stopHub();
                await hub.startHub(log, {port});
                await hub.stopHub();
            } finally {
                delete NativeModules.ClinicHub;
            }

            expect([native.startForegroundService.mock.calls, native.stopForegroundService.mock.calls.slice(-1)]).toEqual([[['hub']], [['hub']]]);
        });
    });
});
