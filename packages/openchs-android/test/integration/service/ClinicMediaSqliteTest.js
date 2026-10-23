/**
 * Photos and files moving between phones through a real hub over the real transport, on real files.
 *
 * Run: npx jest --selectProjects integration --testPathPattern ClinicMediaSqliteTest
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
jest.mock('react-native-fs', () => {
    const nodeFs = require('fs');
    return {
        mockFreeSpace: 10 * 1024 * 1024 * 1024,
        exists: async (path) => nodeFs.existsSync(path),
        stat: async (path) => ({size: nodeFs.statSync(path).size}),
        unlink: async (path) => nodeFs.rmSync(path, {force: true}),
        moveFile: async (from, to) => nodeFs.renameSync(from, to),
        writeFile: async (path, data, encoding) => nodeFs.writeFileSync(path, Buffer.from(data, encoding)),
        appendFile: async (path, data, encoding) => nodeFs.appendFileSync(path, Buffer.from(data, encoding)),
        read: async (path, length, position, encoding) => {
            const fd = nodeFs.openSync(path, 'r');
            const buffer = Buffer.alloc(length);
            const read = nodeFs.readSync(fd, buffer, 0, length, position);
            nodeFs.closeSync(fd);
            return buffer.subarray(0, read).toString(encoding);
        },
        readDir: async (dir) => nodeFs.readdirSync(dir).map((name) => {
            const path = require('path').join(dir, name);
            return {name, path, mtime: nodeFs.statSync(path).mtime};
        }),
        getFSInfo: async function () { return {freeSpace: require('react-native-fs').mockFreeSpace}; },
    };
});
jest.mock('../../../src/framework/clinicsharing/ClinicSharingConstants', () => ({
    ...jest.requireActual('../../../src/framework/clinicsharing/ClinicSharingConstants'),
    MEDIA_BYTES_PER_HUB_SYNC: 5000,
    MEDIA_CHUNK_BYTES: 1500,
}));

import fs from 'react-native-fs';
import nodeFs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import ClinicHubService from "../../../src/service/clinicsharing/ClinicHubService";
import ClinicSpokeService from "../../../src/service/clinicsharing/ClinicSpokeService";
import ClinicRecordService from "../../../src/service/clinicsharing/ClinicRecordService";
import ClinicMediaService from "../../../src/service/clinicsharing/ClinicMediaService";

let dbCount = 0;
let nextPort = 18700 + (process.pid % 500);
const uniqueName = (kind) => `clinic_media_${kind}_test_${process.pid}_${dbCount++}.db`;
const DAY_MS = 24 * 60 * 60 * 1000;
const fileName = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000.jpg`;

// One phone: its media directory, its upload queues and records, and its clinic services.
function device(kind) {
    const root = nodeFs.mkdtempSync(path.join(os.tmpdir(), `clinic-media-${kind}-`));
    const mediaQueue = [];
    const records = {};
    const services = new Map();
    const mediaQueueService = {
        getDirByType: ({type}) => {
            const dir = path.join(root, type);
            nodeFs.mkdirSync(dir, {recursive: true});
            return dir;
        },
        mediaItems: (entity) => entity.media,
    };
    const recordService = {applyBatches: async () => 0, toSharedResource: () => ({}), setupVersion: () => ({Form: 1})};
    services.set('mediaQueueService', mediaQueueService);
    services.set(ClinicRecordService, recordService);
    services.set('clinicParkedRecordService', {afterSync: async () => ({applied: 0, reported: 0})});
    const context = {getService: (key) => services.get(key)};
    const stub = (service) => {
        service.findAll = (schema) => (schema === 'MediaQueue' ? mediaQueue : []);
        service.findByUUID = (uuid) => records[uuid];
        service.dispatchAction = jest.fn();
        return service;
    };
    const media = stub(new ClinicMediaService({isSqlite: true}, context));
    const spoke = stub(new ClinicSpokeService({}, context));
    const hub = stub(new ClinicHubService({}, context));
    spoke.stateName = uniqueName(`${kind}_spoke`);
    spoke.phoneName = () => `${kind} · test phone`;
    hub.ledgerName = uniqueName(`${kind}_hub`);
    services.set('clinicMediaService', media);
    services.set('clinicSpokeService', spoke);
    services.set('clinicHubService', hub);
    return {
        root, mediaQueue, records, media, spoke, hub,
        pathOf: (name, type = 'Image') => path.join(root, type, name),
        takePhoto(name, bytes, type = 'Image') {
            const content = crypto.randomBytes(bytes);
            nodeFs.writeFileSync(path.join(mediaQueueService.getDirByType({type}), name), content);
            mediaQueue.push({fileName: name, type, entityName: 'Encounter', entityUUID: `enc-${name}`});
            return content;
        },
        has: (name, type = 'Image') => nodeFs.existsSync(path.join(root, type, name)),
        contentOf: (name, type = 'Image') => nodeFs.readFileSync(path.join(root, type, name)),
    };
}

describe('Photos and files through the hub', () => {
    let hubPhone, session, port, phones;
    const log = () => {};

    function phone(kind) {
        const p = device(kind);
        p.join = () => { p.spoke.joined = {host: '127.0.0.1', port, ...session}; };
        p.sync = () => p.spoke.syncWithHub({host: '127.0.0.1', port, ...session}, log);
        phones.push(p);
        return p;
    }

    beforeEach(async () => {
        phones = [];
        port = nextPort++;
        fs.mockFreeSpace = 10 * 1024 * 1024 * 1024;
        hubPhone = device('hub');
        session = await hubPhone.hub.startHub(log, {port});
    });

    afterEach(async () => {
        await hubPhone.hub.stopHub();
        for (const p of [hubPhone, ...phones]) {
            if (p.spoke.stateDb) p.spoke.stateDb.close();
            if (p.hub.ledgerDb) p.hub.ledgerDb.close();
            nodeFs.rmSync(p.root, {recursive: true, force: true});
        }
    });

    it('puts a photo on the hub after the next sync, in several pieces, and leaves it in the sender\'s upload queue', async () => {
        const nurse = phone('nurse');
        const photo = nurse.takePhoto(fileName(1), 4000);

        const result = await nurse.sync();

        expect(result.mediaSent).toBe(1);
        expect(hubPhone.contentOf(fileName(1)).equals(photo)).toBe(true);
        expect(nurse.mediaQueue.map((item) => item.fileName)).toEqual([fileName(1)]);
        expect(hubPhone.mediaQueue).toEqual([]);
    });

    it('does not send a photo again, even after the hub restarts', async () => {
        const nurse = phone('nurse');
        nurse.takePhoto(fileName(1), 2000);
        await nurse.sync();
        expect((await nurse.sync()).mediaSent).toBe(0);

        await hubPhone.hub.stopHub();
        session = await hubPhone.hub.startHub(log, {port});

        expect((await nurse.sync()).mediaSent).toBe(0);
        expect(hubPhone.has(fileName(1))).toBe(true);
    });

    it('sends a limited amount in one sync, and the rest in the next', async () => {
        const nurse = phone('nurse');
        [1, 2, 3].forEach((n) => nurse.takePhoto(fileName(n), 3000));

        expect((await nurse.sync()).mediaSent).toBe(2);
        expect((await nurse.sync()).mediaSent).toBe(1);
        expect([1, 2, 3].every((n) => hubPhone.has(fileName(n)))).toBe(true);
    });

    it('refuses photos when the hub is low on storage, says so, and takes them once it has room', async () => {
        const nurse = phone('nurse');
        nurse.takePhoto(fileName(1), 2000);
        fs.mockFreeSpace = 100 * 1024 * 1024;

        const refused = await nurse.sync();

        expect(refused.error).toBeUndefined();
        expect(refused.mediaSent).toBe(0);
        expect(hubPhone.has(fileName(1))).toBe(false);
        expect(hubPhone.media.getHubStorageRefusal().freeMb).toBe(100);

        fs.mockFreeSpace = 10 * 1024 * 1024 * 1024;
        expect((await nurse.sync()).mediaSent).toBe(1);
        expect(hubPhone.media.getHubStorageRefusal()).toBeNull();
    });

    it('lets another phone fetch a photo from the hub when the record is opened', async () => {
        const nurse = phone('nurse');
        const doctor = phone('doctor');
        const photo = nurse.takePhoto(fileName(1), 4000);
        await nurse.sync();
        doctor.join();

        const fetched = await doctor.media.fetchFromHub(fileName(1), 'Image');

        expect(fetched).toBe(doctor.pathOf(fileName(1)));
        expect(doctor.contentOf(fileName(1)).equals(photo)).toBe(true);
    });

    it('gives up on a hub that goes silent mid-fetch, so later photos still arrive', async () => {
        const nurse = phone('nurse');
        const doctor = phone('doctor');
        const photo = nurse.takePhoto(fileName(2), 2000);
        nurse.takePhoto(fileName(1), 2000);
        await nurse.sync();
        doctor.join();
        doctor.media.fetchIdleTimeoutMs = 200;
        const serve = hubPhone.media._serve.bind(hubPhone.media);
        hubPhone.media._serve = async (connection, message) => (message.fileName === fileName(1) ? undefined : serve(connection, message));

        const silent = doctor.media.fetchFromHub(fileName(1), 'Image');
        const next = doctor.media.fetchFromHub(fileName(2), 'Image');

        expect(await silent).toBeNull();
        expect(await next).toBe(doctor.pathOf(fileName(2)));
        expect(doctor.contentOf(fileName(2)).equals(photo)).toBe(true);
        expect(nodeFs.readdirSync(path.join(doctor.root, 'Image')).filter((name) => name.endsWith('.part'))).toEqual([]);
    });

    it('drops a half-received file when the sender disconnects, and stray pieces left for over an hour', async () => {
        let closed = () => {};
        const connection = {send: jest.fn(), onClose: (handler) => { closed = handler; }};
        await hubPhone.media._receiveHeader(connection, {fileName: fileName(1), mediaType: 'Image', entityName: 'Encounter', entityUUID: 'enc-1', size: 3000}, log);
        await hubPhone.media._receiveChunk(connection, {fileName: fileName(1), data: crypto.randomBytes(1000).toString('base64')});
        expect(hubPhone.has(`${fileName(1)}.part`)).toBe(true);

        await closed();
        expect(hubPhone.has(`${fileName(1)}.part`)).toBe(false);

        nodeFs.writeFileSync(hubPhone.pathOf(`${fileName(2)}.part`), 'old');
        nodeFs.writeFileSync(hubPhone.pathOf(`${fileName(3)}.part`), 'new');
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        nodeFs.utimesSync(hubPhone.pathOf(`${fileName(2)}.part`), twoHoursAgo, twoHoursAgo);
        await hubPhone.media.discardStrayParts();

        expect([hubPhone.has(`${fileName(2)}.part`), hubPhone.has(`${fileName(3)}.part`)]).toEqual([false, true]);
    });

    it('fetches nothing for an uploaded photo, a phone not joined to a hub, or a photo the hub lacks', async () => {
        const doctor = phone('doctor');

        expect(await doctor.media.fetchFromHub(fileName(1), 'Image')).toBeNull();
        doctor.join();
        expect(await doctor.media.fetchFromHub(`https://s3.example.org/org-1/${fileName(1)}`, 'Image')).toBeNull();
        expect(await doctor.media.fetchFromHub(fileName(1), 'Image')).toBeNull();
        expect(nodeFs.readdirSync(path.join(doctor.root, 'Image'))).toEqual([]);
    });

    it("deletes the photos it holds for other phones when its data is cleared, and keeps the hub user's own", async () => {
        const nurse = phone('nurse');
        [1, 2].forEach((n) => nurse.takePhoto(fileName(n), 1000));
        await nurse.sync();
        await nurse.sync();
        hubPhone.takePhoto(fileName(3), 1000);
        expect([1, 2].map((n) => hubPhone.has(fileName(n)))).toEqual([true, true]);

        await hubPhone.hub.clearLedger();

        expect([1, 2, 3].map((n) => hubPhone.has(fileName(n)))).toEqual([false, false, true]);
    });

    it("deletes the photos a joined phone fetched from the hub when its data is cleared, and keeps its own", async () => {
        const nurse = phone('nurse'), doctor = phone('doctor');
        nurse.takePhoto(fileName(1), 1000);
        await nurse.sync();
        await nurse.sync();
        doctor.join();
        await doctor.media.recordReceivedMedia('Encounter', [{media: [{fileName: fileName(1)}]}]);
        await doctor.media.fetchFromHub(fileName(1), 'Image');
        doctor.takePhoto(fileName(2), 1000);
        expect(doctor.has(fileName(1))).toBe(true);

        await doctor.spoke.clearState();

        expect([doctor.has(fileName(1)), doctor.has(fileName(2))]).toEqual([false, true]);
    });

    it("keeps every photo copy for the whole camp, however old, and deletes them only when the camp is closed", async () => {
        const nurse = phone('nurse');
        [1, 2].forEach((n) => nurse.takePhoto(fileName(n), 1000));
        await nurse.sync();
        await nurse.sync();
        const ledger = await hubPhone.hub._ledger();
        await ledger.execute('update hub_media set received_at = ?', [Date.now() - 10 * DAY_MS]);

        await hubPhone.media.discardStrayParts();
        expect([1, 2].map((n) => hubPhone.has(fileName(n)))).toEqual([true, true]);

        await hubPhone.hub.closeCamp();
        expect([1, 2].map((n) => hubPhone.has(fileName(n)))).toEqual([false, false]);
    });
});
