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
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => ({getActiveBackend: () => 'sqlite', beanRegistry: {register: jest.fn()}})},
}));
jest.mock('../../src/framework/errorHandling/ErrorUtil', () => ({__esModule: true, default: {notifyBugsnag: jest.fn()}}));

const SyncService = require('../../src/service/SyncService').default;
const ErrorUtil = require('../../src/framework/errorHandling/ErrorUtil').default;

const syncFinding = (violations) => {
    const svc = Object.create(SyncService.prototype);
    svc.context = {getRepositoryFactory: () => ({runForeignKeyCheck: () => violations})};
    return svc;
};

describe('The integrity report after a sync', () => {
    beforeEach(() => ErrorUtil.notifyBugsnag.mockClear());

    it('counts problems per child and parent table, in one report', () => {
        syncFinding([
            {table: 'individual', rowid: 1, parent: 'address_level', fkid: 0},
            {table: 'individual', rowid: 2, parent: 'address_level', fkid: 0},
            {table: 'encounter', rowid: 7, parent: 'individual', fkid: 1},
        ])._checkForeignKeyIntegrityIfSqlite();

        expect(ErrorUtil.notifyBugsnag).toHaveBeenCalledTimes(1);
        expect(ErrorUtil.notifyBugsnag.mock.calls[0][0].message)
            .toBe('3 FK violation(s) after sync: individual→address_level 2, encounter→individual 1');
    });

    it('reports nothing when there are no problems', () => {
        syncFinding([])._checkForeignKeyIntegrityIfSqlite();

        expect(ErrorUtil.notifyBugsnag).not.toHaveBeenCalled();
    });
});
