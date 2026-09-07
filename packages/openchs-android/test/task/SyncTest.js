import {expect} from "chai";

const MOCK_LOCK_ID = 'test-lock-id';

const createSyncModule = ({syncImpl, connectionInfoImpl} = {}) => {
    jest.resetModules();

    const mockDispatch = jest.fn();
    const mockSettingsService = {
        getSettings: jest.fn().mockReturnValue({userId: 'user-1'})
    };
    const mockUserInfoService = {
        getUserSettingsObject: jest.fn().mockReturnValue({disableAutoSync: false})
    };
    const mockSyncTelemetryService = {
        getLatestCompletedSync: jest.fn().mockReturnValue([])
    };
    const mockSyncService = {
        acquireLock: jest.fn().mockReturnValue(MOCK_LOCK_ID),
        releaseLock: jest.fn(),
        sync: syncImpl || jest.fn().mockResolvedValue('syncSource'),
        resetServicesAfterFullSyncCompletion: jest.fn()
    };

    jest.doMock('../../src/GlobalContext', () => ({
        __esModule: true,
        default: {
            getInstance: jest.fn().mockReturnValue({
                isInitialised: jest.fn().mockReturnValue(true),
                beanRegistry: {
                    getService: jest.fn().mockImplementation((service) => {
                        if (service === 'syncService') return mockSyncService;
                        if (service === 'syncTelemetryService') return mockSyncTelemetryService;
                        if (typeof service === 'function' && service.name === 'SettingsService') return mockSettingsService;
                        if (typeof service === 'function' && service.name === 'UserInfoService') return mockUserInfoService;
                        return mockSyncService; // fallback for SyncService class reference
                    })
                },
                reduxStore: {dispatch: mockDispatch}
            })
        }
    }));

    jest.doMock('../../src/service/SyncService', () => ({
        __esModule: true,
        default: {
            syncSources: {ONLY_UPLOAD_BACKGROUND_JOB: 'ONLY_UPLOAD_BACKGROUND_JOB'}
        }
    }));

    jest.doMock('../../src/service/UserInfoService', () => ({
        __esModule: true,
        default: class UserInfoService {}
    }));

    jest.doMock('../../src/service/SettingsService', () => ({
        __esModule: true,
        default: class SettingsService {}
    }));

    jest.doMock('../../src/action/SyncActions', () => ({
        __esModule: true,
        SyncActionNames: {ON_BACKGROUND_SYNC_STATUS_CHANGE: 'ON_BACKGROUND_SYNC_STATUS_CHANGE'}
    }));

    // Kept light for the same reason as SyncActions above: the real module reaches
    // EntityService -> RealmQueryService -> avni-models, which is stubbed here.
    jest.doMock('../../src/action/SyncTelemetryActions', () => ({
        __esModule: true,
        SyncTelemetryActionNames: {SYNC_FAILED: 'SyncTelemetryActions.SYNC_FAILED'}
    }));

    jest.doMock('../../src/framework/EnvironmentConfig', () => ({
        __esModule: true,
        default: {autoSyncDisabled: false}
    }));

    jest.doMock('../../src/utility/ConnectionInfo', () => ({
        __esModule: true,
        getConnectionInfo: connectionInfoImpl || jest.fn().mockResolvedValue({type: 'wifi', isConnected: true})
    }));

    jest.doMock('../../src/utility/ErrorHandler', () => ({
        __esModule: true,
        default: {postScheduledJobError: jest.fn()}
    }));

    jest.doMock('avni-models', () => ({
        __esModule: true,
        EntityMetaData: {model: jest.fn().mockReturnValue([])}
    }));

    jest.doMock('../../src/store/AppStore', () => ({__esModule: true, default: {}}));
    jest.doMock('../../src/framework/db/RealmFactory', () => ({__esModule: true, default: {}}));

    const Sync = require('../../src/task/Sync').default;
    const ErrorHandler = require('../../src/utility/ErrorHandler').default;

    return {Sync, mockSyncService, ErrorHandler, mockDispatch};
};

describe('SyncTest', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('lock management', () => {
        it('holds the lock for the full duration of the sync and releases it only after the sync resolves', async () => {
            let resolveSyncPromise;
            const syncPromise = new Promise(resolve => {
                resolveSyncPromise = resolve;
            });
            const {Sync, mockSyncService} = createSyncModule({
                syncImpl: jest.fn().mockReturnValue(syncPromise)
            });

            const executePromise = Sync.execute();

            // Flush microtasks so execute() runs until it is suspended awaiting the sync promise
            await new Promise(resolve => setImmediate(resolve));

            expect(mockSyncService.sync.mock.calls.length).to.equal(1);
            expect(mockSyncService.releaseLock.mock.calls.length).to.equal(0, 'lock should not be released while sync is in progress');

            resolveSyncPromise('syncSource');
            await executePromise;

            expect(mockSyncService.releaseLock.mock.calls.length).to.equal(1);
            expect(mockSyncService.releaseLock.mock.calls[0][0]).to.equal(MOCK_LOCK_ID);
        });

        it('releases the lock when the sync rejects', async () => {
            const {Sync, mockSyncService, ErrorHandler} = createSyncModule({
                syncImpl: jest.fn().mockRejectedValue(new Error('sync failed'))
            });

            await Sync.execute();

            expect(mockSyncService.releaseLock.mock.calls.length).to.equal(1);
            expect(mockSyncService.releaseLock.mock.calls[0][0]).to.equal(MOCK_LOCK_ID);
            expect(ErrorHandler.postScheduledJobError.mock.calls.length).to.equal(1);
        });

        it('records a failed sync telemetry row when the sync rejects, so a blocked background sync is not invisible', async () => {
            const syncError = new Error('sync failed');
            const {Sync, mockDispatch} = createSyncModule({
                syncImpl: jest.fn().mockRejectedValue(syncError)
            });

            await Sync.execute();

            const failedDispatches = mockDispatch.mock.calls
                .map(call => call[0])
                .filter(action => action.type === 'SyncTelemetryActions.SYNC_FAILED');
            expect(failedDispatches.length).to.equal(1);
            expect(failedDispatches[0].error).to.equal(syncError);
        });

        it('does not record a failed row when the sync succeeds', async () => {
            const {Sync, mockDispatch} = createSyncModule();

            await Sync.execute();

            const failedDispatches = mockDispatch.mock.calls
                .map(call => call[0])
                .filter(action => action.type === 'SyncTelemetryActions.SYNC_FAILED');
            expect(failedDispatches.length).to.equal(0);
        });

        it('releases the lock when getConnectionInfo fails before sync starts', async () => {
            const {Sync, mockSyncService, ErrorHandler} = createSyncModule({
                connectionInfoImpl: jest.fn().mockRejectedValue(new Error('network error'))
            });

            await Sync.execute();

            expect(mockSyncService.sync.mock.calls.length).to.equal(0);
            expect(mockSyncService.releaseLock.mock.calls.length).to.equal(1);
            expect(mockSyncService.releaseLock.mock.calls[0][0]).to.equal(MOCK_LOCK_ID);
            expect(ErrorHandler.postScheduledJobError.mock.calls.length).to.equal(1);
        });
    });
});
