/**
 * Tests for SqliteMigrationService — the per-user state record and the migration
 * leg that drive Realm ↔ SQLite backend switching based on user group membership.
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
        getAllKeys: jest.fn(async () => Array.from(store.keys())),
        multiRemove: jest.fn(async (keys) => { keys.forEach(k => store.delete(k)); }),
        clear: jest.fn(async () => { store.clear(); }),
    };
});

// Mock the GlobalContext require'd lazily inside SqliteMigrationService
const mockGlobalContext = {
    switchBackend: jest.fn(),
    getActiveBackend: jest.fn(() => 'realm'),
};
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {
        getInstance: () => mockGlobalContext,
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
        entitiesLoadedFromServer: () => [{schema: {name: 'Individual'}}, {schema: {name: 'EntitySyncStatus'}}],
    },
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const SessionUsername = require('../../src/service/SessionUsername').default;
const SqliteMigrationServiceModule = require('../../src/service/SqliteMigrationService');
const SqliteMigrationService = SqliteMigrationServiceModule.default;
const {
    SQLITE_MIGRATION_GROUP_UUID,
    SQLITE_MIGRATION_GROUP_NAME,
    BACKENDS,
} = SqliteMigrationServiceModule;

const persisted = (state) => SqliteMigrationService.persistStateForUser('test-user', {
    activeBackend: BACKENDS.REALM,
    desiredBackend: BACKENDS.REALM,
    preparedTarget: null,
    startedAt: null,
    attemptCount: 0,
    lastError: null,
    ...state,
});

describe('SqliteMigrationService', () => {
    let service;
    let mockPrivilegeService;
    let mockEntitySyncStatusService;
    let mockEntityQueueService;
    let mockUserInfoService;
    let mockSettingsService;
    let mockEntityService;
    let mockBeanStore;

    beforeEach(() => {
        // Reset mocks and storage between tests
        AsyncStorage.__store.clear();
        jest.clearAllMocks();

        mockPrivilegeService = {
            ownedGroups: jest.fn(() => []),
        };
        mockEntitySyncStatusService = {
            getTotalEntitiesPending: jest.fn(() => 0),
            setup: jest.fn(),
        };
        mockEntityQueueService = {
            getPendingFieldDataCount: jest.fn(() => 0),
        };
        mockUserInfoService = {
            getUserInfo: jest.fn(() => ({username: 'test-user'})),
        };
        mockEntityService = {
            clearDataIn: jest.fn(),
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
                    case 'PrivilegeService': return mockPrivilegeService;
                    case 'entitySyncStatusService': return mockEntitySyncStatusService;
                    case 'entityQueueService': return mockEntityQueueService;
                    case 'userInfoService': return mockUserInfoService;
                    case 'settingsService': return mockSettingsService;
                    case 'entityService': return mockEntityService;
                    default: return null;
                }
            }),
        };

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

    describe('target backend bootstrap', () => {
        it('runs SettingsService.init() on the target backend', async () => {
            await service._bootstrapTargetSettings(service._captureAuthState());

            expect(mockSettingsService.init).toHaveBeenCalled();
        });

        it('overlays captured auth state (idpType, userId, tokens) on target Settings', async () => {
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

            await service._bootstrapTargetSettings(service._captureAuthState());

            const calls = mockSettingsService.saveOrUpdate.mock.calls;
            const savedSettings = calls[calls.length - 1][0];
            expect(savedSettings.idpType).toBe('keycloak');
            expect(savedSettings.userId).toBe('kc-user');
            expect(savedSettings.accessToken).toBe('jwt-abc');
            expect(savedSettings.refreshToken).toBe('rt-xyz');
        });

        it('does not copy LocaleMapping or UserInfo (they come from sync)', async () => {
            const userInfoSaveOrUpdateSpy = jest.fn();
            mockUserInfoService.saveOrUpdate = userInfoSaveOrUpdateSpy;

            await service._bootstrapTargetSettings(service._captureAuthState());

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

        it('returns true when the stored target differs from the committed backend, whatever the active database says', async () => {
            await persisted({desiredBackend: BACKENDS.SQLITE});
            mockPrivilegeService.ownedGroups.mockReturnValue([]);

            expect(await service.isMigrationPending()).toBe(true);
        });
    });

    describe('recording the desired backend', () => {
        it('stores the target the group names without touching the committed backend', async () => {
            await service.recordDesiredBackend(BACKENDS.SQLITE);

            const state = await service.getState();
            expect(state.desiredBackend).toBe(BACKENDS.SQLITE);
            expect(state.activeBackend).toBe(BACKENDS.REALM);
        });

        it('abandons a prepared attempt once the target matches the committed backend again', async () => {
            await persisted({desiredBackend: BACKENDS.SQLITE, preparedTarget: BACKENDS.SQLITE});

            await service.recordDesiredBackend(BACKENDS.REALM);

            const state = await service.getState();
            expect(state.desiredBackend).toBe(BACKENDS.REALM);
            expect(state.preparedTarget).toBeNull();
        });

        it('keeps a prepared attempt while the target still differs', async () => {
            await persisted({desiredBackend: BACKENDS.SQLITE, preparedTarget: BACKENDS.SQLITE});

            await service.recordDesiredBackend(BACKENDS.SQLITE);

            expect((await service.getState()).preparedTarget).toBe(BACKENDS.SQLITE);
        });
    });

    describe('migration leg', () => {
        it('opens a leg without committing anything', async () => {
            const leg = await service.beginLeg(BACKENDS.SQLITE);

            expect(leg).toEqual({username: 'test-user', source: BACKENDS.REALM, target: BACKENDS.SQLITE});
            const state = await service.getState();
            expect(state.activeBackend).toBe(BACKENDS.REALM);
            expect(state.desiredBackend).toBe(BACKENDS.SQLITE);
            expect(state.attemptCount).toBe(1);
        });

        it('refuses to open a second leg while one is open', async () => {
            await service.beginLeg(BACKENDS.SQLITE);

            await expect(service.beginLeg(BACKENDS.SQLITE)).rejects.toThrow('already open');
        });

        it('opens a leg again once the previous one is abandoned', async () => {
            await service.beginLeg(BACKENDS.SQLITE);
            await service.abandonOpenLeg(new Error('pull failed'));

            await expect(service.beginLeg(BACKENDS.SQLITE)).resolves.toMatchObject({target: BACKENDS.SQLITE});
        });

        it('first attempt wipes the target before seeding checkpoints, then records it as prepared', async () => {
            const leg = await service.beginLeg(BACKENDS.SQLITE);

            expect(await service.prepareTarget(leg)).toBe(false);

            expect(mockEntityService.clearDataIn).toHaveBeenCalled();
            expect(mockEntitySyncStatusService.setup).toHaveBeenCalled();
            expect(mockEntityService.clearDataIn.mock.invocationCallOrder[0])
                .toBeLessThan(mockEntitySyncStatusService.setup.mock.invocationCallOrder[0]);
            expect((await service.getState()).preparedTarget).toBe(BACKENDS.SQLITE);
        });

        // The target's checkpoints are this attempt's own progress record; the pull carries on from them.
        it('re-entry leaves the target alone', async () => {
            await persisted({desiredBackend: BACKENDS.SQLITE, preparedTarget: BACKENDS.SQLITE, attemptCount: 1});
            const leg = await service.beginLeg(BACKENDS.SQLITE);

            expect(await service.prepareTarget(leg)).toBe(true);

            expect(mockEntityService.clearDataIn).not.toHaveBeenCalled();
            expect((await service.getState()).preparedTarget).toBe(BACKENDS.SQLITE);
        });

        it('starting a re-entered target over wipes and seeds it again, keeping the marker', async () => {
            await persisted({desiredBackend: BACKENDS.SQLITE, preparedTarget: BACKENDS.SQLITE, attemptCount: 1});
            const leg = await service.beginLeg(BACKENDS.SQLITE);

            await service.restartTarget(leg);

            expect(mockEntityService.clearDataIn).toHaveBeenCalled();
            expect(mockEntitySyncStatusService.setup).toHaveBeenCalled();
            expect((await service.getState()).preparedTarget).toBe(BACKENDS.SQLITE);
        });

        it('wipes a target whose marker names the other backend', async () => {
            await persisted({desiredBackend: BACKENDS.SQLITE, preparedTarget: BACKENDS.REALM});
            const leg = await service.beginLeg(BACKENDS.SQLITE);

            await service.prepareTarget(leg);

            expect(mockEntityService.clearDataIn).toHaveBeenCalled();
            expect((await service.getState()).preparedTarget).toBe(BACKENDS.SQLITE);
        });

        // Every backend is left with an empty outbox, so this cannot happen unless an
        // invariant broke — and then the wipe would destroy the only copy.
        it('refuses to wipe a target that holds unsynced records', async () => {
            const leg = await service.beginLeg(BACKENDS.SQLITE);
            mockEntityQueueService.getPendingFieldDataCount.mockReturnValue(2);

            await expect(service.prepareTarget(leg)).rejects.toThrow('unsynced');

            expect(mockEntityService.clearDataIn).not.toHaveBeenCalled();
            expect((await service.getState()).preparedTarget).toBeNull();
        });

        it('commits the target as the active backend and clears the attempt', async () => {
            const leg = await service.beginLeg(BACKENDS.SQLITE);
            await service.prepareTarget(leg);

            await service.commitLeg(leg);

            expect(await service.getState()).toMatchObject({
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                preparedTarget: null,
                lastError: null,
            });
        });

        it('fails the commit when the state record cannot be written', async () => {
            const leg = await service.beginLeg(BACKENDS.SQLITE);
            AsyncStorage.setItem.mockImplementationOnce(async () => { throw new Error('disk full'); });

            await expect(service.commitLeg(leg)).rejects.toThrow('disk full');

            expect((await service.getState()).activeBackend).toBe(BACKENDS.REALM);
        });

        it('abandoning a leg puts the runtime back on the committed backend and records only diagnostics', async () => {
            const leg = await service.beginLeg(BACKENDS.SQLITE);
            await service.prepareTarget(leg);
            mockGlobalContext.switchBackend.mockClear();

            await service.abandonOpenLeg(new Error('pull failed'));

            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.REALM);
            const state = await service.getState();
            expect(state.activeBackend).toBe(BACKENDS.REALM);
            expect(state.preparedTarget).toBe(BACKENDS.SQLITE);
            expect(state.lastError).toBe('pull failed');
            const ErrorUtil = require('../../src/framework/errorHandling/ErrorUtil').default;
            expect(ErrorUtil.notifyBugsnag).toHaveBeenCalled();
        });

        // A failed read returns defaults, which name Realm; the leg already knows its source.
        it('abandoning a leg goes back to where it started even when the state record cannot be read', async () => {
            await persisted({activeBackend: BACKENDS.SQLITE, desiredBackend: BACKENDS.REALM});
            const leg = await service.beginLeg(BACKENDS.REALM);
            mockGlobalContext.switchBackend.mockClear();
            AsyncStorage.getItem.mockImplementationOnce(async () => { throw new Error('storage unavailable'); });

            await service.abandonOpenLeg(new Error('pull failed'));

            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.SQLITE);
            const state = await service.getState();
            expect(state.activeBackend).toBe(BACKENDS.SQLITE);
            expect(state.desiredBackend).toBe(BACKENDS.REALM);
        });

        it('abandoning with no open leg does nothing', async () => {
            await service.abandonOpenLeg(new Error('an ordinary sync failure'));

            expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();
        });

        it('runs SQLite → Realm reverse migration', async () => {
            await persisted({activeBackend: BACKENDS.SQLITE, desiredBackend: BACKENDS.SQLITE});
            await service.recordDesiredBackend(BACKENDS.REALM);

            const leg = await service.beginLeg(BACKENDS.REALM);
            await service.prepareTarget(leg);
            await service.commitLeg(leg);

            expect(leg.source).toBe(BACKENDS.SQLITE);
            expect(mockEntityService.clearDataIn).toHaveBeenCalled();
            expect((await service.getState()).activeBackend).toBe(BACKENDS.REALM);
        });
    });

    describe('launch', () => {
        it('opens the committed backend without wiping', async () => {
            await persisted({activeBackend: BACKENDS.SQLITE, desiredBackend: BACKENDS.SQLITE});

            await service.reconcileBackendOnLaunch();

            expect(mockGlobalContext.switchBackend).toHaveBeenCalledWith(BACKENDS.SQLITE);
            expect(mockEntityService.clearDataIn).not.toHaveBeenCalled();
            expect(mockEntitySyncStatusService.setup).not.toHaveBeenCalled();
        });

        it('stays on the complete source backend after an interrupted migration', async () => {
            await persisted({desiredBackend: BACKENDS.SQLITE, preparedTarget: BACKENDS.SQLITE, attemptCount: 1});

            await service.reconcileBackendOnLaunch();

            expect(mockGlobalContext.switchBackend).not.toHaveBeenCalled();
            expect(mockEntityService.clearDataIn).not.toHaveBeenCalled();
        });
    });

    describe('storage', () => {
        it('readStateForUser returns default state when nothing persisted', async () => {
            const state = await SqliteMigrationService.readStateForUser('new-user');
            expect(state.activeBackend).toBe(BACKENDS.REALM);
            expect(state.preparedTarget).toBeNull();
            expect(state.attemptCount).toBe(0);
        });

        it('persistStateForUser round-trips state', async () => {
            const original = {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                preparedTarget: null,
                startedAt: 12345,
                attemptCount: 3,
                lastError: 'something',
            };
            await SqliteMigrationService.persistStateForUser('user-x', original);
            const read = await SqliteMigrationService.readStateForUser('user-x');
            expect(read).toEqual(original);
        });

        it('keys state on the session username, not the active backend UserInfo row (#2083)', async () => {
            // The device last ran Realm as anjali, so Realm's UserInfo row still says anjali.
            mockUserInfoService.getUserInfo.mockReturnValue({username: 'anjali@phulwari'});
            await SessionUsername.set('nupoork@ntest');
            await SqliteMigrationService.persistStateForUser('anjali@phulwari', {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
            });

            const state = await service.getState();

            expect(state.activeBackend).toBe(BACKENDS.REALM);
        });

        it('falls back to the UserInfo row when no session username was recorded', async () => {
            mockUserInfoService.getUserInfo.mockReturnValue({username: 'legacy-user'});
            await SqliteMigrationService.persistStateForUser('legacy-user', {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
            });

            const state = await service.getState();

            expect(state.activeBackend).toBe(BACKENDS.SQLITE);
        });

        it('writes state under the session username', async () => {
            mockUserInfoService.getUserInfo.mockReturnValue({username: 'anjali@phulwari'});
            await SessionUsername.set('nupoork@ntest');

            await service.persistState({
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
            });

            const written = await SqliteMigrationService.readStateForUser('nupoork@ntest');
            const untouched = await SqliteMigrationService.readStateForUser('anjali@phulwari');
            expect(written.activeBackend).toBe(BACKENDS.SQLITE);
            expect(untouched.activeBackend).toBe(BACKENDS.REALM);
        });

        it('clearAllMigrationState removes every user\'s key', async () => {
            await SqliteMigrationService.persistStateForUser('a@x', {activeBackend: BACKENDS.SQLITE});
            await SqliteMigrationService.persistStateForUser('b@x', {activeBackend: BACKENDS.SQLITE});
            AsyncStorage.__store.set('unrelated.key', 'keep me');

            await SqliteMigrationService.clearAllMigrationState();

            expect((await SqliteMigrationService.readStateForUser('a@x')).activeBackend).toBe(BACKENDS.REALM);
            expect((await SqliteMigrationService.readStateForUser('b@x')).activeBackend).toBe(BACKENDS.REALM);
            expect(AsyncStorage.__store.get('unrelated.key')).toBe('keep me');
        });

        it('state is keyed by username (different users do not collide)', async () => {
            await SqliteMigrationService.persistStateForUser('alice', {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                startedAt: null, attemptCount: 0, lastError: null,
            });
            const aliceState = await SqliteMigrationService.readStateForUser('alice');
            const bobState = await SqliteMigrationService.readStateForUser('bob');
            expect(aliceState.activeBackend).toBe(BACKENDS.SQLITE);
            expect(bobState.activeBackend).toBe(BACKENDS.REALM); // default
        });
    });
});
