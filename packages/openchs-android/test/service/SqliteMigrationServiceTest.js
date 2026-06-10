/**
 * Tests for SqliteMigrationService — the state machine that drives dynamic
 * Realm ↔ SQLite backend switching based on user group membership.
 *
 * Run: npx jest test/service/SqliteMigrationServiceTest.js --verbose
 */

// Mock AsyncStorage before importing the service
jest.mock('@react-native-async-storage/async-storage', () => {
    const store = new Map();
    return {
        __store: store,
        getItem: jest.fn(async (key) => store.has(key) ? store.get(key) : null),
        setItem: jest.fn(async (key, value) => { store.set(key, value); }),
        removeItem: jest.fn(async (key) => { store.delete(key); }),
        clear: jest.fn(async () => { store.clear(); }),
    };
});

// Mock the GlobalContext require'd lazily inside SqliteMigrationService
const mockGlobalContext = {
    switchBackend: jest.fn(),
    getActiveBackend: jest.fn(() => 'realm'),
    beanRegistry: {
        getService: jest.fn(),
    },
};
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {
        getInstance: () => mockGlobalContext,
    },
}));

// Mock SyncService import
jest.mock('../../src/service/SyncService', () => ({
    __esModule: true,
    default: {
        syncSources: {
            ONLY_UPLOAD_BACKGROUND_JOB: 'automatic-upload-only',
            BACKGROUND_JOB: 'automatic',
            SYNC_BUTTON: 'manual',
        },
    },
}));

// Mock Bugsnag
jest.mock('../../src/framework/errorHandling/ErrorUtil', () => ({
    __esModule: true,
    default: {
        notifyBugsnag: jest.fn(),
    },
}));

// Mock General logging (no-op so test output isn't noisy)
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {
        logInfo: jest.fn(),
        logWarn: jest.fn(),
        logError: jest.fn(),
        logDebug: jest.fn(),
    },
}));

// Mock the @Service decorator (it requires a runtime that we don't need for unit tests)
jest.mock('../../src/framework/bean/Service', () => () => () => {});

// Mock BaseService to a simple stub that just stores beanStore for getService()
jest.mock('../../src/service/BaseService', () => {
    return {
        __esModule: true,
        default: class {
            constructor(db, beanStore) {
                this.db = db;
                this.beanStore = beanStore;
            }
            getService(name) {
                if (this.beanStore && typeof this.beanStore.getService === 'function') {
                    return this.beanStore.getService(name);
                }
                return null;
            }
            init() {}
        },
    };
});

// Mock openchs-models so EntityMetaData.model() doesn't blow up
jest.mock('openchs-models', () => ({
    EntityMetaData: {
        model: () => [],
    },
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const SqliteMigrationServiceModule = require('../../src/service/SqliteMigrationService');
const SqliteMigrationService = SqliteMigrationServiceModule.default;
const {
    SQLITE_MIGRATION_GROUP_UUID,
    SQLITE_MIGRATION_GROUP_NAME,
    MIGRATION_PHASES,
    BACKENDS,
} = SqliteMigrationServiceModule;

describe('SqliteMigrationService', () => {
    let service;
    let mockSyncService;
    let mockPrivilegeService;
    let mockEntitySyncStatusService;
    let mockUserInfoService;
    let mockSettingsService;
    let mockBeanStore;

    beforeEach(() => {
        // Reset mocks and storage between tests
        AsyncStorage.__store.clear();
        jest.clearAllMocks();

        mockSyncService = {
            sync: jest.fn(async () => undefined),
            acquireLock: jest.fn(() => 'test-lock'),
            releaseLock: jest.fn(),
        };
        mockPrivilegeService = {
            ownedGroups: jest.fn(() => []),
        };
        mockEntitySyncStatusService = {
            getTotalEntitiesPending: jest.fn(() => 0),
            setup: jest.fn(),
        };
        mockUserInfoService = {
            getUserInfo: jest.fn(() => ({username: 'test-user'})),
        };
        // Default mock: settings has idpType set so the auth bootstrap path "just works"
        const mockSettings = {
            idpType: 'cognito',
            userId: 'test-user',
            accessToken: null,
            refreshToken: null,
            poolId: 'test-pool',
            clientId: 'test-client',
            clone: function() { return {...this, clone: this.clone}; },
        };
        mockSettingsService = {
            init: jest.fn(async () => {}),
            getSettings: jest.fn(() => mockSettings),
            saveOrUpdate: jest.fn(),
        };

        mockBeanStore = {
            getService: jest.fn((name) => {
                switch (name) {
                    case 'syncService': return mockSyncService;
                    case 'PrivilegeService': return mockPrivilegeService;
                    case 'entitySyncStatusService': return mockEntitySyncStatusService;
                    case 'userInfoService': return mockUserInfoService;
                    case 'settingsService': return mockSettingsService;
                    default: return null;
                }
            }),
        };

        // Wire up the GlobalContext mock to also return syncService via beanRegistry
        mockGlobalContext.beanRegistry.getService.mockImplementation((name) => {
            if (name === 'syncService') return mockSyncService;
            return null;
        });
        mockGlobalContext.switchBackend.mockClear();
        mockGlobalContext.getActiveBackend.mockReturnValue('realm');

        service = new SqliteMigrationService({}, mockBeanStore);
    });

    describe('group membership detection', () => {
        it('returns realm when user is in no groups', () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([]);
            expect(service.computeDesiredBackend()).toBe(BACKENDS.REALM);
        });

        it('returns sqlite when user is in the SQLite Migration group (by UUID)', () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: 'Some Renamed Group'},
            ]);
            expect(service.computeDesiredBackend()).toBe(BACKENDS.SQLITE);
        });

        it('returns sqlite when user is in the SQLite Migration group (by name)', () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: 'some-other-uuid', groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            expect(service.computeDesiredBackend()).toBe(BACKENDS.SQLITE);
        });

        it('returns realm when user is in unrelated groups', () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: 'some-other-uuid', groupName: 'Everyone'},
                {groupUuid: 'another-uuid', groupName: 'Administrators'},
            ]);
            expect(service.computeDesiredBackend()).toBe(BACKENDS.REALM);
        });
    });

    describe('checkAndMaybeMigrate', () => {
        it('is a no-op when desired backend matches active backend', async () => {
            // No groups → desired = realm. Default state has activeBackend = realm.
            await service.checkAndMaybeMigrate();
            expect(mockSyncService.sync).not.toHaveBeenCalled();
            expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
        });

        it('runs full Realm → SQLite migration on first launch (no pending uploads)', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            mockEntitySyncStatusService.getTotalEntitiesPending.mockReturnValue(0);

            await service.checkAndMaybeMigrate();

            // Upload phase skipped because nothing pending
            // Then backend switch
            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.SQLITE);
            // Baseline entity sync status seeded on target backend
            expect(mockEntitySyncStatusService.setup).toHaveBeenCalled();
            // Then target sync
            expect(mockSyncService.sync).toHaveBeenCalledTimes(1);
            // Final state: idle on sqlite
            const state = await service.getState();
            expect(state.phase).toBe(MIGRATION_PHASES.IDLE);
            expect(state.activeBackend).toBe(BACKENDS.SQLITE);
        });

        it('runs upload-only sync when pending entities exist', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            mockEntitySyncStatusService.getTotalEntitiesPending.mockReturnValue(5);

            await service.checkAndMaybeMigrate();

            // Two syncs: upload-only, then full target sync
            expect(mockSyncService.sync).toHaveBeenCalledTimes(2);
            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.SQLITE);
        });

        it('runs SQLite → Realm reverse migration', async () => {
            // Start in SQLite state
            await SqliteMigrationService.persistStateForUser('test-user', {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.IDLE,
                attemptCount: 0,
                lastError: null,
            });
            // User no longer in group
            mockPrivilegeService.ownedGroups.mockReturnValue([]);

            await service.checkAndMaybeMigrate();

            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.REALM);
            const state = await service.getState();
            expect(state.activeBackend).toBe(BACKENDS.REALM);
            expect(state.phase).toBe(MIGRATION_PHASES.IDLE);
        });
    });

    describe('target backend bootstrap', () => {
        it('runs SettingsService.init() on the target backend', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            await service.checkAndMaybeMigrate();
            expect(mockSettingsService.init).toHaveBeenCalled();
        });

        it('overlays captured auth state (idpType, userId, tokens) on target Settings', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            // Source has a Keycloak user with tokens
            mockSettingsService.getSettings.mockReturnValue({
                idpType: 'keycloak',
                userId: 'kc-user',
                accessToken: 'jwt-abc',
                refreshToken: 'rt-xyz',
                poolId: '',
                clientId: 'client-1',
                keycloakAuthServerUrl: 'https://kc.example.com',
                keycloakClientId: 'client-1',
                keycloakScope: 'openid',
                keycloakGrantType: 'password',
                keycloakRealm: 'avni',
                clone: function() { return {...this, clone: this.clone}; },
            });

            await service.checkAndMaybeMigrate();

            // saveOrUpdate should have been called with merged settings carrying the auth fields
            expect(mockSettingsService.saveOrUpdate).toHaveBeenCalled();
            const lastCall = mockSettingsService.saveOrUpdate.mock.calls[mockSettingsService.saveOrUpdate.mock.calls.length - 1];
            const savedSettings = lastCall[0];
            expect(savedSettings.idpType).toBe('keycloak');
            expect(savedSettings.userId).toBe('kc-user');
            expect(savedSettings.accessToken).toBe('jwt-abc');
            expect(savedSettings.refreshToken).toBe('rt-xyz');
        });

        it('does not copy LocaleMapping or UserInfo (they come from sync)', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            const userInfoSaveOrUpdateSpy = jest.fn();
            mockUserInfoService.saveOrUpdate = userInfoSaveOrUpdateSpy;

            await service.checkAndMaybeMigrate();

            expect(userInfoSaveOrUpdateSpy).not.toHaveBeenCalled();
        });
    });

    describe('isMigrationPending', () => {
        it('returns false when desired backend matches active backend (idle)', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([]);
            const pending = await service.isMigrationPending();
            expect(pending).toBe(false);
        });

        it('returns true when desired backend differs from active backend', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            const pending = await service.isMigrationPending();
            expect(pending).toBe(true);
        });

        it('returns true when phase is non-idle (resumable migration)', async () => {
            await SqliteMigrationService.persistStateForUser('test-user', {
                activeBackend: BACKENDS.REALM,
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.PENDING_TARGET_SYNC,
                attemptCount: 1,
                lastError: null,
            });
            const pending = await service.isMigrationPending();
            expect(pending).toBe(true);
        });
    });

    describe('failure handling', () => {
        it('upload phase failure leaves state at pending_upload and notifies Bugsnag and logs', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            mockEntitySyncStatusService.getTotalEntitiesPending.mockReturnValue(3);
            mockSyncService.sync.mockImplementationOnce(async () => {
                throw new Error('upload failed');
            });

            await expect(service.checkAndMaybeMigrate()).rejects.toThrow('upload failed');

            const state = await service.getState();
            expect(state.phase).toBe(MIGRATION_PHASES.PENDING_UPLOAD);
            expect(state.lastError).toBe('upload failed');
            expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();

            const ErrorUtil = require('../../src/framework/errorHandling/ErrorUtil').default;
            expect(ErrorUtil.notifyBugsnag).toHaveBeenCalled();
            const General = require('../../src/utility/General').default;
            expect(General.logError).toHaveBeenCalled();
        });

        it('target sync failure leaves state at pending_target_sync', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            mockEntitySyncStatusService.getTotalEntitiesPending.mockReturnValue(0);
            // First sync (target full sync) fails
            mockSyncService.sync.mockImplementationOnce(async () => {
                throw new Error('target sync failed');
            });

            await expect(service.checkAndMaybeMigrate()).rejects.toThrow('target sync failed');

            const state = await service.getState();
            expect(state.phase).toBe(MIGRATION_PHASES.PENDING_TARGET_SYNC);
            // Backend was switched (we always switch into target before running sync)
            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.SQLITE);
        });
    });

    describe('resume', () => {
        it('resumeIfPending is no-op when state is idle', async () => {
            await service.resumeIfPending();
            expect(mockSyncService.sync).not.toHaveBeenCalled();
            expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
        });

        it('resumes from pending_upload phase', async () => {
            await SqliteMigrationService.persistStateForUser('test-user', {
                activeBackend: BACKENDS.REALM,
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.PENDING_UPLOAD,
                attemptCount: 1,
                lastError: 'previous failure',
            });
            mockEntitySyncStatusService.getTotalEntitiesPending.mockReturnValue(2);

            await service.resumeIfPending();

            // Re-runs upload, switches, runs target sync
            expect(mockSyncService.sync).toHaveBeenCalledTimes(2);
            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.SQLITE);
            const state = await service.getState();
            expect(state.phase).toBe(MIGRATION_PHASES.IDLE);
            expect(state.activeBackend).toBe(BACKENDS.SQLITE);
            expect(state.attemptCount).toBe(2);
        });

        it('resumes from pending_target_sync phase (entity checkpoints handle resume)', async () => {
            await SqliteMigrationService.persistStateForUser('test-user', {
                activeBackend: BACKENDS.REALM, // app booted into source backend after crash
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.PENDING_TARGET_SYNC,
                attemptCount: 1,
                lastError: null,
            });
            mockGlobalContext.getActiveBackend.mockReturnValue('realm');

            await service.resumeIfPending();

            // Should ensure backend is switched to target before running sync
            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.SQLITE);
            // Only the target sync runs (upload phase is skipped)
            expect(mockSyncService.sync).toHaveBeenCalledTimes(1);
            const state = await service.getState();
            expect(state.phase).toBe(MIGRATION_PHASES.IDLE);
            expect(state.activeBackend).toBe(BACKENDS.SQLITE);
        });

        it('resumes from completing phase (just flips activeBackend to idle)', async () => {
            await SqliteMigrationService.persistStateForUser('test-user', {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.COMPLETING,
                attemptCount: 1,
                lastError: null,
            });

            await service.resumeIfPending();

            expect(mockSyncService.sync).not.toHaveBeenCalled();
            const state = await service.getState();
            expect(state.phase).toBe(MIGRATION_PHASES.IDLE);
        });
    });

    describe('re-entrancy', () => {
        it('concurrent calls do not double-trigger migration', async () => {
            mockPrivilegeService.ownedGroups.mockReturnValue([
                {groupUuid: SQLITE_MIGRATION_GROUP_UUID, groupName: SQLITE_MIGRATION_GROUP_NAME},
            ]);
            mockEntitySyncStatusService.getTotalEntitiesPending.mockReturnValue(0);

            // Make sync take a tick so concurrent calls overlap
            mockSyncService.sync.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10)));

            const p1 = service.checkAndMaybeMigrate();
            const p2 = service.checkAndMaybeMigrate(); // should be no-op due to in-progress flag

            await Promise.all([p1, p2]);

            // Only one migration ran (1 sync = target sync, no upload)
            expect(mockSyncService.sync).toHaveBeenCalledTimes(1);
        });
    });

    describe('storage', () => {
        it('readStateForUser returns default state when nothing persisted', async () => {
            const state = await SqliteMigrationService.readStateForUser('new-user');
            expect(state.activeBackend).toBe(BACKENDS.REALM);
            expect(state.phase).toBe(MIGRATION_PHASES.IDLE);
            expect(state.attemptCount).toBe(0);
        });

        it('persistStateForUser round-trips state', async () => {
            const original = {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.IDLE,
                startedAt: 12345,
                attemptCount: 3,
                lastError: 'something',
            };
            await SqliteMigrationService.persistStateForUser('user-x', original);
            const read = await SqliteMigrationService.readStateForUser('user-x');
            expect(read).toEqual(original);
        });

        it('state is keyed by username (different users do not collide)', async () => {
            await SqliteMigrationService.persistStateForUser('alice', {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.IDLE,
                startedAt: null, attemptCount: 0, lastError: null,
            });
            const aliceState = await SqliteMigrationService.readStateForUser('alice');
            const bobState = await SqliteMigrationService.readStateForUser('bob');
            expect(aliceState.activeBackend).toBe(BACKENDS.SQLITE);
            expect(bobState.activeBackend).toBe(BACKENDS.REALM); // default
        });
    });
});
