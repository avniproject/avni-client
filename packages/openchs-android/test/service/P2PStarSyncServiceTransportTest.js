jest.mock('react-native-libsodium', () => require('libsodium-wrappers'));
jest.mock('react-native-tcp-socket', () => {
    const net = require('net');
    // The phone dials the hub's CLINIC_PORT; point it at this test's port instead.
    return {...net, createConnection: (options, cb) => net.createConnection({...options, port: global.__hubPort}, cb)};
});
jest.mock('../../src/framework/bean/Service', () => () => (target) => target);
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));

import P2PStarSyncService from '../../src/service/P2PStarSyncService';
import * as ClinicTransport from '../../src/framework/clinicsharing/ClinicTransport';

function serviceWithStubbedData(deviceId) {
    const service = new P2PStarSyncService({}, {getService: () => ({})});
    const meta = {};
    service.deviceId = async () => deviceId;
    service._getMeta = async (key) => meta[key] || null;
    service._setMeta = async (key, value) => { meta[key] = `${value}`; };
    service.dispatchAction = jest.fn();
    service.meta = meta;
    return service;
}

describe('Hub sync over the clinic transport', () => {
    let hub, phone, logs;
    const log = (message) => logs.push(message);

    beforeEach(() => {
        logs = [];
        hub = serviceWithStubbedData('hub-device');
        phone = serviceWithStubbedData('phone-device');
        global.__hubPort = 17500 + Math.floor(Math.random() * 400);
        const realStartHub = ClinicTransport.startHub;
        jest.spyOn(ClinicTransport, 'startHub').mockImplementation((options) => realStartHub({...options, port: global.__hubPort}));
    });

    afterEach(async () => {
        await hub.stopHub();
        jest.restoreAllMocks();
    });

    it('pushes the outbox, pulls what the hub serves, applies it and moves the cursor', async () => {
        const pushed = [{entityName: 'Individual', resources: [{uuid: 'ind-from-phone'}]}];
        const served = [{entityName: 'Encounter', resources: [{uuid: 'enc-from-hub'}]}];
        hub._hubHandlePush = jest.fn(async () => ({applied: 1}));
        hub._hubHandlePull = jest.fn(async () => ({batches: served, maxSeq: 42}));
        phone.collectOutbox = () => pushed;
        phone.applyBatches = jest.fn(async () => 1);

        const session = await hub.startHub(log);
        await phone.syncWithHub({host: '127.0.0.1', ...session}, log);

        expect(hub._hubHandlePush.mock.calls[0][0]).toMatchObject({deviceId: 'phone-device', batches: pushed});
        expect(hub._hubHandlePull.mock.calls[0][0]).toMatchObject({deviceId: 'phone-device', since: 0});
        expect(phone.applyBatches.mock.calls[0][0]).toEqual(served);
        expect(phone.meta.cursor).toBe('42');
    });

    it('tells the phone to scan again when it holds the code from before a hub restart', async () => {
        hub._hubHandlePush = jest.fn();
        phone.collectOutbox = () => [];
        const oldSession = await hub.startHub(log);
        await hub.startHub(log);

        await phone.syncWithHub({host: '127.0.0.1', ...oldSession}, log);

        expect(hub._hubHandlePush).not.toHaveBeenCalled();
        expect(logs.some((l) => /Scan the hub's current QR code/.test(l))).toBe(true);
        expect(phone.meta.cursor).toBeUndefined();
    });
});
