/**
 * react-native-tcp-socket throws "Socket is closed" when written after a close. A connect event
 * arriving for a socket that already closed must end the join quietly, not crash the app.
 *
 * Run: npx jest --selectProjects unit --testPathPattern ClinicTransportClosedSocketTest
 */
jest.mock('react-native-libsodium', () => require('libsodium-wrappers'));

const mockSockets = [];
jest.mock('react-native-tcp-socket', () => ({
    createConnection: () => {
        const {EventEmitter} = require('events');
        const socket = new EventEmitter();
        socket.setEncoding = () => {};
        socket.destroy = jest.fn();
        socket.write = () => { throw new Error('Socket is closed'); };
        mockSockets.push(socket);
        return socket;
    },
}));

import {connectToHub, generateSessionKey} from '../../../src/framework/clinicsharing/ClinicTransport';

describe('Joining over a socket that closed before it connected', () => {
    it('ends the join as closed instead of throwing out of the connect event', async () => {
        const key = await generateSessionKey();
        const joining = connectToHub({host: '192.168.49.1', key, hubId: 'hub-1', epoch: 'epoch-1', timeoutMs: 2000});
        await new Promise((resolve) => setImmediate(resolve));

        expect(() => mockSockets[0].emit('connect')).not.toThrow();
        await expect(joining).rejects.toMatchObject({code: 'closed'});
    });
});
