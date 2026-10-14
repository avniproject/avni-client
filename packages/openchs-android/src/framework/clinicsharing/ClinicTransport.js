import TcpSocket from 'react-native-tcp-socket';
import {
    crypto_secretbox_easy,
    crypto_secretbox_NONCEBYTES,
    crypto_secretbox_open_easy,
    from_base64,
    randombytes_buf,
    ready,
    to_base64
} from 'react-native-libsodium';
import _ from 'lodash';

export const CLINIC_PORT = 7373;
const HANDSHAKE_TIMEOUT_MS = 5000;
const SESSION_KEY_BYTES = 32;

export const MessageType = {
    hello: 'hello',
    refused: 'refused',
    push: 'push',
    pushAck: 'pushAck',
    pull: 'pull',
    pullResult: 'pullResult',
    mediaPush: 'mediaPush',
    mediaAck: 'mediaAck',
    mediaRequest: 'mediaRequest',
    mediaData: 'mediaData',
};

const RefusalMessage = {
    key: () => "This phone's code is out of date. Scan the hub's current QR code.",
    stale: () => "This phone's code is from before the hub restarted. Scan the hub's current QR code.",
    version: ({hub, peer}) => `This phone is on app version ${peer} and the hub is on ${hub}. Both need the same version.`,
    timeout: () => 'The hub did not answer. Check this phone is on the hub\'s Wi-Fi.',
    closed: () => 'The hub closed the connection.',
};

export class ClinicTransportError extends Error {
    constructor(code, details = {}) {
        super(RefusalMessage[code](details));
        this.code = code;
        this.details = details;
    }
}

export async function generateSessionKey() {
    await ready;
    return to_base64(randombytes_buf(SESSION_KEY_BYTES));
}

// Plaintext stays ASCII (\uXXXX escapes): Hermes has no TextDecoder and libsodium's fallback rejects Indic text.
const asciiJson = (message) => JSON.stringify(message)
    .replace(/[\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

function asciiBytesToString(bytes) {
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return text;
}

function seal(keyBytes, message) {
    const nonce = randombytes_buf(crypto_secretbox_NONCEBYTES);
    const ciphertext = crypto_secretbox_easy(asciiJson(message), nonce, keyBytes);
    return JSON.stringify({n: to_base64(nonce), c: to_base64(ciphertext)});
}

function open(keyBytes, line) {
    try {
        const {n, c} = JSON.parse(line);
        return JSON.parse(asciiBytesToString(crypto_secretbox_open_easy(from_base64(c), from_base64(n), keyBytes)));
    } catch (e) {
        return null;
    }
}

export async function sealLine(key, message) {
    await ready;
    return seal(from_base64(key), message);
}

export async function openLine(key, line) {
    await ready;
    return open(from_base64(key), line);
}

// Lines are ASCII, so latin1 is exact and skips the slow polyfilled UTF-8 conversion in the socket library.
const WIRE_ENCODING = 'latin1';

const writeLine = (socket, keyBytes, message) => socket.write(seal(keyBytes, message) + '\n', WIRE_ENCODING);

function lineReader(onLine) {
    let buffer = '';
    return (data) => {
        const scanFrom = buffer.length;
        buffer += data;
        let index = buffer.indexOf('\n', scanFrom);
        while (index >= 0) {
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            if (line.length > 0) onLine(line);
            index = buffer.indexOf('\n');
        }
    };
}

class Connection {
    constructor(socket, keyBytes, peer) {
        this.socket = socket;
        this.keyBytes = keyBytes;
        this.peer = peer;
        this.messageHandlers = [];
        this.closeHandlers = [];
        this.pending = [];
        socket.on('close', () => this.closeHandlers.forEach((handler) => handler()));
    }

    send(message) {
        writeLine(this.socket, this.keyBytes, message);
    }

    onMessage(handler) {
        this.messageHandlers.push(handler);
        const pending = this.pending;
        this.pending = [];
        pending.forEach((message) => handler(message));
        return () => _.pull(this.messageHandlers, handler);
    }

    onClose(handler) {
        this.closeHandlers.push(handler);
    }

    close() {
        this.socket.destroy();
    }

    _deliver(message) {
        if (this.messageHandlers.length === 0) this.pending.push(message);
        else this.messageHandlers.forEach((handler) => handler(message));
    }
}

const hello = ({appVersion, hubId, epoch}) => ({type: MessageType.hello, appVersion, hubId, epoch});

export async function startHub({key, appVersion, hubId, epoch, port = CLINIC_PORT, onConnection, log = _.noop}) {
    await ready;
    const keyBytes = from_base64(key);
    const sockets = new Set();

    const server = TcpSocket.createServer((socket) => {
        socket.setEncoding(WIRE_ENCODING);
        sockets.add(socket);
        const peerName = socket.remoteAddress;
        let connection = null;
        const refuse = (refusal, why) => {
            log(`Refused ${peerName}: ${why}`);
            socket.end(seal(keyBytes, {type: MessageType.refused, ...refusal}) + '\n', WIRE_ENCODING);
        };

        socket.on('data', lineReader((line) => {
            const message = open(keyBytes, line);
            if (message === null) {
                if (connection) return log(`Dropped an unreadable message from ${peerName}`);
                log(`Refused ${peerName}: its messages could not be read, so it holds an old or wrong key`);
                return socket.destroy();
            }
            if (connection) return connection._deliver(message);

            if (message.type !== MessageType.hello) return refuse({reason: 'closed'}, `sent ${message.type} before hello`);
            if (message.appVersion !== appVersion)
                return refuse({reason: 'version', hub: appVersion, peer: message.appVersion}, `app version ${message.appVersion}, hub is on ${appVersion}`);
            if (message.hubId !== hubId || message.epoch !== epoch)
                return refuse({reason: 'stale'}, `scanned an earlier code (epoch ${message.epoch})`);
            connection = new Connection(socket, keyBytes, _.pick(message, ['appVersion', 'hubId', 'epoch']));
            onConnection(connection);
        }));
        socket.on('error', (error) => log(`Socket error from ${peerName}: ${error.message}`));
        socket.on('close', () => sockets.delete(socket));
        writeLine(socket, keyBytes, hello({appVersion, hubId, epoch}));
    });

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen({port, host: '0.0.0.0'}, resolve);
    });
    server.on('error', (error) => log(`Hub error: ${error.message}`));
    log(`Hub listening on :${port}`);

    return {
        stop: () => new Promise((resolve) => {
            sockets.forEach((socket) => socket.destroy());
            server.close(() => resolve());
        }),
    };
}

export async function connectToHub({host, key, appVersion, hubId, epoch, port = CLINIC_PORT, timeoutMs = HANDSHAKE_TIMEOUT_MS}) {
    await ready;
    const keyBytes = from_base64(key);

    return new Promise((resolve, reject) => {
        let connection = null;
        let settled = false;
        // interface:'wifi' binds to the hotspot; otherwise a phone with a SIM routes over mobile data.
        const socket = TcpSocket.createConnection({port, host, interface: 'wifi'}, () => {});
        socket.setEncoding(WIRE_ENCODING);
        let closed = false;
        const fail = (code, details) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (!closed) socket.destroy();
            reject(new ClinicTransportError(code, details));
        };
        const timer = setTimeout(() => fail('timeout'), timeoutMs);

        socket.on('connect', () => writeLine(socket, keyBytes, hello({appVersion, hubId, epoch})));
        socket.on('data', lineReader((line) => {
            const message = open(keyBytes, line);
            if (connection) return message === null ? undefined : connection._deliver(message);
            if (message === null) return fail('key');
            if (message.type === MessageType.refused) return fail(message.reason, _.pick(message, ['hub', 'peer']));
            if (message.type !== MessageType.hello) return fail('closed');
            if (message.appVersion !== appVersion) return fail('version', {hub: message.appVersion, peer: appVersion});
            if (message.hubId !== hubId || message.epoch !== epoch) return fail('stale');

            settled = true;
            clearTimeout(timer);
            connection = new Connection(socket, keyBytes, _.pick(message, ['appVersion', 'hubId', 'epoch']));
            resolve(connection);
        }));
        socket.on('error', () => fail('closed'));
        socket.on('close', () => {
            closed = true;
            fail('closed');
        });
    });
}
