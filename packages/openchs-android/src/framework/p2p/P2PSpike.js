import TcpSocket from 'react-native-tcp-socket';
import NetInfo from '@react-native-community/netinfo';

const PORT = 7373;
const CHUNK_SIZE = 64 * 1024;

const errStr = (error) => (error && error.message) || JSON.stringify(error);

// T1-lite transport spike: NDJSON over TCP between two devices on a phone hotspot.
class P2PSpike {
    constructor() {
        this.server = null;
    }

    isHubRunning() {
        return this.server !== null;
    }

    startHub(log) {
        if (this.server) {
            log('Hub already running');
            return;
        }
        this.server = TcpSocket.createServer((socket) => {
            log(`Peer connected: ${socket.remoteAddress}`);
            const session = {buffer: '', blobBytes: 0, blobStartedAt: 0};
            socket.on('data', (data) => {
                session.buffer += data.toString();
                let idx;
                while ((idx = session.buffer.indexOf('\n')) >= 0) {
                    const line = session.buffer.slice(0, idx);
                    session.buffer = session.buffer.slice(idx + 1);
                    if (line.length > 0) this._onHubMessage(JSON.parse(line), socket, session, log);
                }
            });
            socket.on('error', (error) => log(`Socket error: ${errStr(error)}`));
        });
        this.server.on('error', (error) => log(`Hub error: ${errStr(error)}`));
        this.server.listen({port: PORT, host: '0.0.0.0'}, () => log(`Hub listening on :${PORT}`));
    }

    stopHub(log) {
        if (!this.server) return;
        this.server.close();
        this.server = null;
        log('Hub stopped');
    }

    _onHubMessage(message, socket, session, log) {
        switch (message.type) {
            case 'ping':
                socket.write(JSON.stringify({type: 'pong', sentAt: message.sentAt}) + '\n');
                break;
            case 'blobStart':
                session.blobBytes = 0;
                session.blobStartedAt = Date.now();
                break;
            case 'chunk':
                session.blobBytes += message.data.length;
                break;
            case 'blobEnd': {
                const ms = Date.now() - session.blobStartedAt;
                log(`Blob received: ${session.blobBytes} bytes in ${ms}ms`);
                socket.write(JSON.stringify({type: 'blobAck', receivedBytes: session.blobBytes, ms: ms}) + '\n');
                break;
            }
            default:
                log(`Unknown message: ${message.type}`);
        }
    }

    scanForHub(log) {
        return NetInfo.fetch('wifi').then((state) => {
            const ip = state.details && state.details.ipAddress;
            if (!(state.isConnected && ip)) {
                log(`Wifi not connected — join the hub's hotspot first (mobile data can stay on)`);
                return null;
            }
            const base = ip.substring(0, ip.lastIndexOf('.'));
            log(`My IP ${ip}, scanning ${base}.* for hub on :${PORT}...`);
            const startedAt = Date.now();
            const candidates = [];
            for (let i = 1; i <= 254; i++) {
                const candidate = `${base}.${i}`;
                if (candidate !== ip) candidates.push(candidate);
            }
            return this._probeBatches(candidates, 0).then((found) => {
                log(found ? `Hub found at ${found} (${Date.now() - startedAt}ms)` : 'No hub found on subnet — is Start Hub running?');
                return found;
            });
        });
    }

    _probeBatches(hosts, offset) {
        if (offset >= hosts.length) return Promise.resolve(null);
        const batch = hosts.slice(offset, offset + 32).map((host) => this._probe(host));
        return Promise.all(batch).then((results) => results.find((r) => r !== null) || this._probeBatches(hosts, offset + 32));
    }

    _probe(host) {
        return new Promise((resolve) => {
            const socket = TcpSocket.createConnection({port: PORT, host: host, interface: 'wifi'}, () => {});
            const timer = setTimeout(() => {
                socket.destroy();
                resolve(null);
            }, 700);
            socket.on('connect', () => {
                clearTimeout(timer);
                socket.destroy();
                resolve(host);
            });
            socket.on('error', () => {
                clearTimeout(timer);
                socket.destroy();
                resolve(null);
            });
        });
    }

    ping(host, log) {
        const sentAt = Date.now();
        const socket = this._connect(host, log, (message) => {
            if (message.type === 'pong') {
                log(`Pong from ${host}: RTT ${Date.now() - message.sentAt}ms`);
                socket.destroy();
            }
        });
        socket.on('connect', () => socket.write(JSON.stringify({type: 'ping', sentAt: sentAt}) + '\n'));
    }


    sendTestPayload(host, sizeMB, log) {
        const totalBytes = sizeMB * 1024 * 1024;
        const chunk = 'x'.repeat(CHUNK_SIZE);
        const startedAt = Date.now();
        const socket = this._connect(host, log, (message) => {
            if (message.type === 'blobAck') {
                const ms = Date.now() - startedAt;
                const mbps = ((message.receivedBytes * 8) / (ms / 1000) / 1e6).toFixed(1);
                log(`Ack: ${message.receivedBytes} bytes in ${ms}ms (${mbps} Mbps)`);
                socket.destroy();
            }
        });
        socket.on('connect', () => {
            log(`Sending ${sizeMB}MB to ${host}...`);
            socket.write(JSON.stringify({type: 'blobStart', totalBytes: totalBytes}) + '\n');
            for (let sent = 0; sent < totalBytes; sent += CHUNK_SIZE) {
                socket.write(JSON.stringify({type: 'chunk', data: chunk}) + '\n');
            }
            socket.write(JSON.stringify({type: 'blobEnd'}) + '\n');
        });
    }

    _connect(host, log, onMessage) {
        // interface:'wifi' binds to the wifi network — without it, an active SIM makes
        // Android route app sockets via cellular and the hotspot subnet is unreachable.
        const socket = TcpSocket.createConnection({port: PORT, host: host, interface: 'wifi'}, () => {});
        let buffer = '';
        socket.on('data', (data) => {
            buffer += data.toString();
            let idx;
            while ((idx = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                if (line.length > 0) onMessage(JSON.parse(line));
            }
        });
        socket.on('error', (error) => log(`Connection error: ${errStr(error)}`));
        return socket;
    }
}

export default new P2PSpike();
