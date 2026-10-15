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
import {LEDGER_RETENTION_DAYS} from "../../../src/framework/clinicsharing/ClinicSharingConstants";

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
    const recordService = {applyBatches: async () => 0, toSharedResource: () => ({})};
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

    it('fetches nothing for an uploaded photo, a phone not joined to a hub, or a photo the hub lacks', async () => {
        const doctor = phone('doctor');

        expect(await doctor.media.fetchFromHub(fileName(1), 'Image')).toBeNull();
        doctor.join();
        expect(await doctor.media.fetchFromHub(`https://s3.example.org/org-1/${fileName(1)}`, 'Image')).toBeNull();
        expect(await doctor.media.fetchFromHub(fileName(1), 'Image')).toBeNull();
        expect(nodeFs.readdirSync(path.join(doctor.root, 'Image'))).toEqual([]);
    });

    it('deletes its copy once the record holds the photo\'s link, or after a week, and never the hub phone\'s own photos', async () => {
        const nurse = phone('nurse');
        [1, 2, 3].forEach((n) => nurse.takePhoto(fileName(n), 1000));
        await nurse.sync();
        await nurse.sync();
        hubPhone.takePhoto(fileName(4), 1000);
        hubPhone.records[`enc-${fileName(1)}`] = {media: [{fileName: `https://s3.example.org/org-1/${fileName(1)}`}]};
        hubPhone.records[`enc-${fileName(2)}`] = {media: [{fileName: fileName(2)}]};
        hubPhone.records[`enc-${fileName(3)}`] = {media: [{fileName: fileName(3)}]};
        const ledger = await hubPhone.hub._ledger();
        await ledger.execute('update hub_media set received_at = ? where file_name = ?', [Date.now() - (LEDGER_RETENTION_DAYS + 1) * DAY_MS, fileName(3)]);

        await hubPhone.hub.pruneLedger();

        expect([1, 2, 3, 4].map((n) => hubPhone.has(fileName(n)))).toEqual([false, true, false, true]);
    });
});
