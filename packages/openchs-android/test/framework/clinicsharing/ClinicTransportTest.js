jest.mock('react-native-libsodium', () => require('libsodium-wrappers'));
jest.mock('react-native-tcp-socket', () => require('net'));

import crypto from 'crypto';
import net from 'net';
import {
    ClinicTransportError,
    connectToHub,
    generateSessionKey,
    MessageType,
    openLine,
    sealLine,
    startHub
} from '../../../src/framework/clinicsharing/ClinicTransport';

let nextPort = 17400;

describe('ClinicTransport', () => {
    let hub, logs, connections, key;
    const hubDefaults = () => ({appVersion: '18.1.1', hubId: 'hub-1', epoch: 'epoch-1'});

    beforeEach(async () => {
        key = await generateSessionKey();
        logs = [];
        connections = [];
    });

    afterEach(async () => {
        connections.forEach((c) => c.close());
        if (hub) await hub.stop();
        hub = null;
    });

    const ackPushes = (connection) => connection.onMessage((message) => {
        if (message.type === MessageType.push) connection.send({type: MessageType.pushAck, upTo: message.upTo, size: message.payload.length});
    });

    async function startTestHub({onConnection = ackPushes, ...overrides} = {}) {
        const port = nextPort++;
        hub = await startHub({
            ...hubDefaults(), key, port, ...overrides,
            log: (message) => logs.push(message),
            onConnection: (connection) => {
                connections.push(connection);
                onConnection(connection);
            },
        });
        return port;
    }

    const connect = (port, overrides = {}) => connectToHub({
        host: '127.0.0.1', port, ...hubDefaults(), key, timeoutMs: 2000, ...overrides,
    }).then((connection) => {
        connections.push(connection);
        return connection;
    });

    const nextMessage = (connection) => new Promise((resolve) => connection.onMessage(resolve));

    it('seals each message so the wire carries only a nonce and ciphertext', async () => {
        const line = await sealLine(key, {type: MessageType.push, payload: 'Sunita Devi, ANC visit'});

        expect(Object.keys(JSON.parse(line)).sort()).toEqual(['c', 'n']);
        expect(line).not.toContain('Sunita');
        expect(await openLine(key, line)).toEqual({type: MessageType.push, payload: 'Sunita Devi, ANC visit'});
    });

    it('carries Indic text intact', async () => {
        const message = {type: MessageType.push, name: 'सुनीता देवी', village: 'ଭୁବନେଶ୍ୱର', emoji: '👩🏽‍⚕️'};

        expect(await openLine(key, await sealLine(key, message))).toEqual(message);
    });

    it('cannot open a line sealed with another key', async () => {
        const line = await sealLine(await generateSessionKey(), {type: MessageType.push});

        expect(await openLine(key, line)).toBeNull();
    });

    it('exchanges messages after the handshake', async () => {
        const port = await startTestHub();
        const phone = await connect(port);

        expect(phone.peer).toEqual({appVersion: '18.1.1', hubId: 'hub-1', epoch: 'epoch-1'});
        const reply = nextMessage(phone);
        phone.send({type: MessageType.push, upTo: 7, payload: 'abc'});
        expect(await reply).toEqual({type: MessageType.pushAck, upTo: 7, size: 3});
    });

    it('refuses a phone holding another key straight away, and the hub logs it', async () => {
        const port = await startTestHub();
        const startedAt = Date.now();

        const error = await connect(port, {key: await generateSessionKey()}).catch((e) => e);

        expect(error).toBeInstanceOf(ClinicTransportError);
        expect(error.code).toBe('key');
        expect(Date.now() - startedAt).toBeLessThan(1000);
        await waitFor(() => logs.some((l) => /could not be read/.test(l)));
    });

    it('refuses a phone on another app version, telling both sides both versions', async () => {
        const port = await startTestHub();

        const error = await connect(port, {appVersion: '18.1.0'}).catch((e) => e);

        expect(error.code).toBe('version');
        expect(error.details).toEqual({hub: '18.1.1', peer: '18.1.0'});
        await waitFor(() => logs.some((l) => l.includes('18.1.0') && l.includes('18.1.1')));
    });

    it('refuses a phone that scanned an earlier code from a restarted hub', async () => {
        const port = await startTestHub({epoch: 'epoch-2'});

        const error = await connect(port, {epoch: 'epoch-1'}).catch((e) => e);

        expect(error.code).toBe('stale');
    });

    it('carries a 5 MB message intact', async () => {
        let hubReceived;
        const received = new Promise((resolve) => { hubReceived = resolve; });
        const port = await startTestHub({onConnection: (connection) => connection.onMessage(hubReceived)});
        const payload = crypto.randomBytes(5 * 1024 * 1024).toString('base64');
        const phone = await connect(port);

        phone.send({type: MessageType.mediaPush, payload});
        const message = await received;

        const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
        expect(message.payload.length).toBe(payload.length);
        expect(sha(message.payload)).toBe(sha(payload));
    }, 30000);

    it('serves several phones at once', async () => {
        const port = await startTestHub();

        const phones = await Promise.all([1, 2, 3, 4].map(() => connect(port)));
        const replies = await Promise.all(phones.map((phone, i) => {
            const reply = nextMessage(phone);
            phone.send({type: MessageType.push, upTo: i, payload: 'x'.repeat(i)});
            return reply;
        }));

        expect(replies.map((r) => r.upTo)).toEqual([0, 1, 2, 3]);
    });

    it('drops and logs an unreadable line after the handshake, keeping the connection', async () => {
        const port = await startTestHub();
        const socket = net.createConnection({port, host: '127.0.0.1'});
        const lines = readLines(socket);
        await new Promise((resolve) => socket.on('connect', resolve));

        expect((await openLine(key, await lines.next())).type).toBe(MessageType.hello);
        socket.write(await sealLine(key, {type: MessageType.hello, ...hubDefaults()}) + '\n');
        socket.write(await sealLine(await generateSessionKey(), {type: MessageType.push, upTo: 0, payload: ''}) + '\n');
        socket.write(await sealLine(key, {type: MessageType.push, upTo: 1, payload: ''}) + '\n');

        expect((await openLine(key, await lines.next())).upTo).toBe(1);
        expect(logs.some((l) => /Dropped/.test(l))).toBe(true);
        socket.destroy();
    });

    it('fails a request at once when the hub has already hung up, instead of waiting forever', async () => {
        const port = await startTestHub({onConnection: (connection) => connection.close()});
        const phone = await connect(port);
        await waitFor(() => phone.closed);

        await expect(phone.request({type: MessageType.pull, since: 0}, MessageType.pullResult)).rejects.toMatchObject({code: 'closed'});
        expect(() => phone.send({type: MessageType.pull, since: 0})).toThrow(ClinicTransportError);
    });

    it('gives up on a request the hub never answers, and leaves no handlers behind', async () => {
        const port = await startTestHub({onConnection: () => {}});
        const phone = await connect(port);
        const closeHandlers = phone.closeHandlers.length;

        await expect(phone.request({type: MessageType.pull, since: 0}, MessageType.pullResult, undefined, 100)).rejects.toMatchObject({code: 'timeout'});
        expect([phone.closeHandlers.length, phone.messageHandlers.length]).toEqual([closeHandlers, 0]);
    });

    it('drops a phone that connects but never says hello', async () => {
        const port = await startTestHub();
        const socket = net.createConnection({port, host: '127.0.0.1'});
        let closed = false;
        socket.on('close', () => { closed = true; });
        socket.on('error', () => {});
        socket.resume();

        await waitFor(() => closed, 8000);
        expect(logs.some((l) => /nothing received/.test(l))).toBe(true);
    }, 10000);
});

async function waitFor(condition, timeoutMs = 2000) {
    const startedAt = Date.now();
    while (!condition()) {
        if (Date.now() - startedAt > timeoutMs) throw new Error('condition not met');
        await new Promise((r) => setTimeout(r, 20));
    }
}

function readLines(socket) {
    let buffer = '';
    const waiting = [];
    const ready = [];
    socket.on('data', (data) => {
        buffer += data.toString();
        let index;
        while ((index = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            waiting.length ? waiting.shift()(line) : ready.push(line);
        }
    });
    return {next: () => ready.length ? Promise.resolve(ready.shift()) : new Promise((resolve) => waiting.push(resolve))};
}
