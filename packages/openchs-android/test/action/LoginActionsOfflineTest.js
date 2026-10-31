/**
 * #2070: logging in with no internet must say the network is the problem, not show the
 * generic authentication code. Cognito reports a failed fetch as Error('Network error') and
 * the login wrapper turns it into AuthenticationError('Authentication failure', err).
 *
 * Run: npx jest test/action/LoginActionsOfflineTest.js --selectProjects unit
 */
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({
    zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()})),
}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false),
    setGenericPassword: jest.fn(async () => {}),
    resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn()},
}));
jest.mock('../../src/utility/Analytics', () => ({firebaseEvents: {}, logEvent: jest.fn()}));

const {LoginActions} = require('../../src/action/LoginActions');
const AuthService = require('../../src/service/AuthService').default;
const AuthenticationError = require('../../src/service/AuthenticationError').default;

function loginFailingWith(error) {
    const provider = {authenticate: () => Promise.reject(error)};
    const context = {get: (s) => (s === AuthService ? {getAuthProviderService: () => provider} : undefined)};
    return new Promise((resolve) => {
        LoginActions.onLoginStarted({userId: 'u@org', password: 'p'}, {failure: resolve}, context);
    });
}

describe('login error when the device is offline', () => {
    it('Cognito offline error is reported as a network problem', async () => {
        const msg = await loginFailingWith(new AuthenticationError('Authentication failure', new Error('Network error')));
        expect(msg).toMatch(/internet connection/i);
        expect(msg).not.toBe('Authentication failure');
    });

    it('fetch failure is still reported as a network problem', async () => {
        const msg = await loginFailingWith(new AuthenticationError('Authentication failure', new TypeError('Network request failed')));
        expect(msg).toMatch(/internet connection/i);
    });

    it('wrong credentials still show the authentication code', async () => {
        const err = new Error('Incorrect username or password.');
        err.code = 'NotAuthorizedException';
        const msg = await loginFailingWith(new AuthenticationError('NotAuthorizedException', err));
        expect(msg).toBe('NotAuthorizedException');
    });
});
