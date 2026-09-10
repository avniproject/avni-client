/**
 * #2118 — the Realm→SQLite switch runs only inside a sync the user started.
 *
 * A background full sync (the twelve-hour download) reaches the same mid-sync
 * migration check as a manual sync and cannot otherwise tell the two apart. With
 * no screen, no progress and a ten-minute ceiling imposed by the phone, a switch
 * started there is usually cut off and leaves a half-filled database. So the check
 * declines and completes as a normal sync on the current backend; the next manual
 * sync does the switch.
 *
 * Run: npx jest test/service/SyncServiceBackgroundNoSwitchTest.js --selectProjects unit --verbose
 */

// Native leaf modules pulled in transitively by SyncService's import tree.
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

const mockGlobalContext = {
    switchBackend: jest.fn(),
    getActiveBackend: jest.fn(() => 'realm'),
    // The @Service decorator registers every service against this at import time.
    beanRegistry: {register: jest.fn()},
};
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));

const SyncService = require('../../src/service/SyncService').default;
const General = require('../../src/utility/General').default;

const migrationService = {
    computeDesiredBackend: jest.fn(() => 'sqlite'),
    _captureAuthState: jest.fn(() => ({idpType: 'keycloak'})),
    getState: jest.fn(async () => ({phase: 'idle'})),
    persistState: jest.fn(async () => {}),
    _bootstrapTargetSettings: jest.fn(async () => {}),
    _resetTargetBackend: jest.fn(),
};

/** A service that is due to switch: desired sqlite, active realm, empty outbox. */
function buildSwitchCandidate() {
    const svc = Object.create(SyncService.prototype);
    svc.entityQueueService = {
        getPendingFieldDataCount: jest.fn(() => 0),
        getPendingFieldDataSummary: jest.fn(() => ''),
    };
    svc.getService = jest.fn((name) => name === 'sqliteMigrationService' ? migrationService : undefined);
    return svc;
}

describe('_checkAndSwitchBackendMidSync — manual sync only', () => {
    beforeEach(() => {
        mockGlobalContext.switchBackend.mockClear();
        mockGlobalContext.getActiveBackend.mockReturnValue('realm');
        migrationService.persistState.mockClear();
        migrationService._resetTargetBackend.mockClear();
        General.logInfo.mockClear();
    });

    it('declines to switch on a background sync', async () => {
        const svc = buildSwitchCandidate();

        const switched = await svc._checkAndSwitchBackendMidSync(() => {}, false);

        expect(switched).toBe(false);
        expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
        expect(migrationService.persistState).not.toHaveBeenCalled();
        expect(migrationService._resetTargetBackend).not.toHaveBeenCalled();
    });

    it('leaves one log line saying the switch is waiting for a manual sync', async () => {
        const svc = buildSwitchCandidate();

        await svc._checkAndSwitchBackendMidSync(() => {}, false);

        const deferralLines = General.logInfo.mock.calls
            .filter(([, message]) => /background sync; deferring to the next manual sync/.test(message));
        expect(deferralLines).toHaveLength(1);
    });

    it('does not show the switching message on a background sync', async () => {
        const svc = buildSwitchCandidate();
        const statusMessageCallBack = jest.fn();

        await svc._checkAndSwitchBackendMidSync(statusMessageCallBack, false);

        expect(statusMessageCallBack).not.toHaveBeenCalled();
    });

    it('switches on a manual sync under the same state', async () => {
        const svc = buildSwitchCandidate();

        const switched = await svc._checkAndSwitchBackendMidSync(() => {}, true);

        expect(switched).toBe(true);
        expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith('sqlite');
    });

    it('threads the flag from _switchBackendAndResyncRefDataIfNeeded', async () => {
        const svc = buildSwitchCandidate();
        svc._checkAndSwitchBackendMidSync = jest.fn(async () => false);

        const result = await svc._switchBackendAndResyncRefDataIfNeeded(() => {}, () => {}, [], false);

        expect(result).toBeNull();
        expect(svc._checkAndSwitchBackendMidSync).toHaveBeenCalledWith(expect.any(Function), false);
    });
});
