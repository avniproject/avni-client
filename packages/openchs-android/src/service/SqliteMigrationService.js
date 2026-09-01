import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import General from "../utility/General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import SessionUsername from "./SessionUsername";
import {BACKENDS} from "../framework/BackendTypes";

// Note: Other services are looked up via this.getService(name) (string-based) to avoid
// circular import chains during module load. EntityMetaData and SyncService are required
// lazily inside methods that actually run a sync.

/**
 * SqliteMigrationService
 *
 * Drives the per-user dynamic switch between Realm and SQLite backends, based on
 * membership in the well-known "SQLite Migration" server group. The flag is delivered
 * via the existing MyGroups sync entity — no new server contracts.
 *
 * The migration is a small state machine persisted in AsyncStorage so it can recover
 * from crashes, force-quits, or network failures at any phase.
 *
 *   idle → pending_upload → pending_target_sync → completing → idle
 *
 * Source backend is left intact throughout the migration. Failures stay at the
 * current phase; the next sync attempt resumes from there. Failures are reported
 * to BOTH Bugsnag and General.logError so users can upload logs.
 */

export const SQLITE_MIGRATION_GROUP_UUID = "e6e5e4e3-e2e1-4f00-8000-d0d1d2d3d4d5";
export const SQLITE_MIGRATION_GROUP_NAME = "SQLite Migration";

export const MIGRATION_PHASES = {
    IDLE: 'idle',
    PENDING_UPLOAD: 'pending_upload',
    PENDING_TARGET_SYNC: 'pending_target_sync',
    COMPLETING: 'completing',
};

// BACKENDS re-exported so existing importers continue to work. Canonical definition
// lives in framework/BackendTypes to avoid circular imports with GlobalContext.
export {BACKENDS};

const ASYNC_STORAGE_KEY_PREFIX = 'avni.sqliteMigration.';

function asyncStorageKey(username) {
    return `${ASYNC_STORAGE_KEY_PREFIX}${username || 'unknown'}`;
}

function defaultState() {
    return {
        activeBackend: BACKENDS.REALM,
        desiredBackend: BACKENDS.REALM,
        phase: MIGRATION_PHASES.IDLE,
        startedAt: null,
        attemptCount: 0,
        lastError: null,
    };
}

@Service('sqliteMigrationService')
class SqliteMigrationService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this._migrationInProgress = false;
    }

    init() {
    }

    /**
     * Static helper for GlobalContext to read state before services are wired up.
     */
    static async readStateForUser(username) {
        try {
            const raw = await AsyncStorage.getItem(asyncStorageKey(username));
            if (!raw) return defaultState();
            const parsed = JSON.parse(raw);
            return {...defaultState(), ...parsed};
        } catch (e) {
            General.logWarn("SqliteMigrationService", `Failed to read migration state for ${username}: ${e.message}`);
            return defaultState();
        }
    }

    // Called when the device's data is wiped (Delete Data, or a different user logging
    // in). Leaving these behind means the next launch reconciles the backend from a
    // user who no longer has data here.
    static async clearAllMigrationState() {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const migrationKeys = _.filter(keys, k => _.startsWith(k, ASYNC_STORAGE_KEY_PREFIX));
            if (!_.isEmpty(migrationKeys)) {
                await AsyncStorage.multiRemove(migrationKeys);
                General.logInfo("SqliteMigrationService", `Cleared migration state: ${migrationKeys.join(', ')}`);
            }
        } catch (e) {
            General.logError("SqliteMigrationService", `Failed to clear migration state: ${e.message}`);
        }
    }

    static async persistStateForUser(username, state) {
        try {
            await AsyncStorage.setItem(asyncStorageKey(username), JSON.stringify(state));
        } catch (e) {
            General.logError("SqliteMigrationService", `Failed to persist migration state for ${username}: ${e.message}`);
        }
    }

    // UserInfo lives in whichever database is active, which at launch is Realm — and
    // Realm's row belongs to whoever last used Realm, not necessarily the session user.
    // Prefer the username recorded at login, outside both databases.
    async _getCurrentUsername() {
        const sessionUsername = await SessionUsername.get();
        if (sessionUsername) return sessionUsername;
        // Installs that have not logged in since this was introduced have no recorded
        // session username; fall back to the row this used to key on.
        try {
            const userInfoService = this.getService('userInfoService');
            if (!userInfoService) return null;
            const userInfo = userInfoService.getUserInfo();
            return userInfo && userInfo.username ? userInfo.username : null;
        } catch (e) {
            return null;
        }
    }

    async getState() {
        const username = await this._getCurrentUsername();
        return SqliteMigrationService.readStateForUser(username);
    }

    async persistState(state) {
        const username = await this._getCurrentUsername();
        await SqliteMigrationService.persistStateForUser(username, state);
    }

    /**
     * Compute the desired backend based on current group membership.
     * Returns 'sqlite' if the user belongs to the SQLite Migration group, else 'realm'.
     */
    computeDesiredBackend() {
        try {
            const privilegeService = this.getService('PrivilegeService');
            if (!privilegeService) return BACKENDS.REALM;
            const groups = privilegeService.ownedGroups();
            const inGroup = _.some(groups, g =>
                g.groupUuid === SQLITE_MIGRATION_GROUP_UUID ||
                g.groupName === SQLITE_MIGRATION_GROUP_NAME
            );
            return inGroup ? BACKENDS.SQLITE : BACKENDS.REALM;
        } catch (e) {
            General.logWarn("SqliteMigrationService", `Failed to compute desired backend: ${e.message}`);
            return BACKENDS.REALM;
        }
    }

    /**
     * Lightweight check used by callers (e.g., SyncComponent._postSync) to decide
     * whether to surface a "switching backend" UI before invoking the migration.
     * Returns true if a migration is currently in-progress (resumable) OR if the
     * desired backend (per group membership) differs from the active backend.
     */
    async isMigrationPending() {
        try {
            const state = await this.getState();
            if (state.phase !== MIGRATION_PHASES.IDLE) return true;
            const desired = this.computeDesiredBackend();
            return desired !== state.activeBackend;
        } catch (e) {
            return false;
        }
    }

    /**
     * Entry point from sync completion hook. Detects backend change and starts
     * a migration if needed. Re-entrant safe.
     *
     * @param {Object} [callbacks] - optional progress/message callbacks for the
     *     sync UI to update during the migration sync
     * @param {Function} [callbacks.onProgress] - (progress, currentPage, totalPages) => void
     * @param {Function} [callbacks.onMessage] - (message) => void
     */
    async checkAndMaybeMigrate(callbacks) {
        if (this._migrationInProgress) return;
        const state = await this.getState();
        if (state.phase !== MIGRATION_PHASES.IDLE) {
            return this.resume(state, callbacks);
        }

        const desired = this.computeDesiredBackend();
        if (desired === state.activeBackend) return;

        General.logInfo("SqliteMigrationService",
            `Backend change detected: activeBackend=${state.activeBackend} desiredBackend=${desired} — starting migration`);

        state.desiredBackend = desired;
        state.phase = MIGRATION_PHASES.PENDING_UPLOAD;
        state.startedAt = Date.now();
        state.attemptCount = 0;
        state.lastError = null;
        await this.persistState(state);
        return this.resume(state, callbacks);
    }

    /**
     * Entry point from app startup. Two jobs:
     *   1. Reconcile the active backend for already-migrated users. GlobalContext
     *      always boots on Realm because it doesn't know the per-user migration
     *      state at init time. If the persisted state says we finished migrating
     *      to SQLite, flip the bean registry's active backend here.
     *   2. If a migration was in progress, resume it.
     */
    async resumeIfPending() {
        const state = await this.getState();
        const GlobalContext = require('../GlobalContext').default;
        const globalContext = GlobalContext.getInstance();

        if (state.phase === MIGRATION_PHASES.IDLE) {
            if (state.activeBackend === BACKENDS.SQLITE
                && globalContext.getActiveBackend() !== BACKENDS.SQLITE) {
                General.logInfo("SqliteMigrationService",
                    "Reconciling backend on launch: state=sqlite but active=realm — switching to SQLite");
                globalContext.switchBackend(BACKENDS.SQLITE);
            }
            return;
        }

        General.logInfo("SqliteMigrationService",
            `Resuming pending migration on launch: phase=${state.phase} active=${state.activeBackend} desired=${state.desiredBackend}`);
        return this.resume(state);
    }

    /**
     * Run a sync as part of the migration. Mirrors the invocation pattern from
     * task/Sync.js so we go through the same code paths as a normal sync.
     */
    /**
     * Capture auth state from the original Realm backend by accessing it directly
     * (bypassing the currently-active backend). Used as a fallback during resume
     * if the target Settings is missing the auth state from a prior failed bootstrap.
     */
    _captureAuthStateFromSource() {
        try {
            const GlobalContext = require('../GlobalContext').default;
            const realmDb = GlobalContext.getInstance().db;
            if (!realmDb || typeof realmDb.objects !== 'function') return null;
            const settingsResults = realmDb.objects('Settings');
            if (!settingsResults || settingsResults.length === 0) return null;
            const settings = settingsResults[0];
            const auth = {
                idpType: settings.idpType,
                userId: settings.userId,
                accessToken: settings.accessToken,
                refreshToken: settings.refreshToken,
                poolId: settings.poolId,
                clientId: settings.clientId,
                keycloakAuthServerUrl: settings.keycloakAuthServerUrl,
                keycloakClientId: settings.keycloakClientId,
                keycloakScope: settings.keycloakScope,
                keycloakGrantType: settings.keycloakGrantType,
                keycloakRealm: settings.keycloakRealm,
            };
            General.logInfo("SqliteMigrationService",
                `Captured auth state from source Realm: idpType=${auth.idpType}`);
            return auth;
        } catch (e) {
            General.logWarn("SqliteMigrationService",
                `Failed to capture auth state from source Realm: ${e.message}`);
            return null;
        }
    }

    /**
     * Capture ONLY the per-user authentication state from Settings on the source
     * backend. Everything else (default Settings fields, LocaleMapping, UserInfo,
     * OrganisationConfig) is populated on the target backend by:
     *   - SettingsService.init() — creates default Settings row from config
     *   - The migration sync itself — pulls UserInfo, OrganisationConfig, etc. from server
     *   - SyncService.resetServicesAfterFullSyncCompletion() → initLanguages() — populates LocaleMapping
     *
     * Auth state is the ONLY thing the server cannot provide and the user has
     * already configured (via login on the source backend), so it must be carried
     * over manually. For Cognito, the JWT lives in AsyncStorage so even less is needed.
     */
    _captureAuthState() {
        try {
            const settingsService = this.getService('settingsService');
            if (!settingsService) return null;
            const settings = settingsService.getSettings();
            if (!settings) return null;
            const auth = {
                idpType: settings.idpType,
                userId: settings.userId,
                accessToken: settings.accessToken,
                refreshToken: settings.refreshToken,
                poolId: settings.poolId,
                clientId: settings.clientId,
                keycloakAuthServerUrl: settings.keycloakAuthServerUrl,
                keycloakClientId: settings.keycloakClientId,
                keycloakScope: settings.keycloakScope,
                keycloakGrantType: settings.keycloakGrantType,
                keycloakRealm: settings.keycloakRealm,
            };
            General.logInfo("SqliteMigrationService",
                `Captured auth state: idpType=${auth.idpType}, userId=${auth.userId ? 'set' : 'unset'}`);
            return auth;
        } catch (e) {
            General.logWarn("SqliteMigrationService", `Failed to capture auth state: ${e.message}`);
            return null;
        }
    }

    /**
     * Bootstrap Settings on the target backend:
     *   1. Run SettingsService.init() to create the default Settings row using
     *      values from config (serverURL, etc.). This is the same path used on
     *      a fresh install.
     *   2. Overlay the captured auth state (idpType, userId, tokens, etc.) so
     *      the migration sync can authenticate as the same user.
     *
     * Falls back gracefully if any step fails — the migration sync would then
     * surface an auth error and the migration stays at pending_target_sync for
     * the next attempt.
     */
    async _bootstrapTargetSettings(authState) {
        const settingsService = this.getService('settingsService');
        if (!settingsService) {
            throw new Error("settingsService unavailable on target backend");
        }
        // Step 1: Run SettingsService.init() on the target backend. It creates
        // the default Settings row from config if missing. This is idempotent.
        try {
            if (typeof settingsService.init === 'function') {
                General.logInfo("SqliteMigrationService", "Running SettingsService.init() on target backend");
                await settingsService.init();
            }
        } catch (e) {
            General.logWarn("SqliteMigrationService",
                `SettingsService.init() on target backend failed: ${e.message}`);
        }

        // Step 2: Overlay captured auth state on top of the default Settings.
        // This is the ONLY data we copy from the source backend.
        if (authState) {
            try {
                const settings = settingsService.getSettings();
                if (settings) {
                    const updated = settings.clone();
                    if (authState.idpType != null) updated.idpType = authState.idpType;
                    if (authState.userId != null) updated.userId = authState.userId;
                    if (authState.accessToken != null) updated.accessToken = authState.accessToken;
                    if (authState.refreshToken != null) updated.refreshToken = authState.refreshToken;
                    if (authState.poolId) updated.poolId = authState.poolId;
                    if (authState.clientId) updated.clientId = authState.clientId;
                    if (authState.keycloakAuthServerUrl) updated.keycloakAuthServerUrl = authState.keycloakAuthServerUrl;
                    if (authState.keycloakClientId) updated.keycloakClientId = authState.keycloakClientId;
                    if (authState.keycloakScope) updated.keycloakScope = authState.keycloakScope;
                    if (authState.keycloakGrantType) updated.keycloakGrantType = authState.keycloakGrantType;
                    if (authState.keycloakRealm) updated.keycloakRealm = authState.keycloakRealm;
                    settingsService.saveOrUpdate(updated);
                    General.logInfo("SqliteMigrationService",
                        `Restored auth state on target backend (idpType=${updated.idpType})`);
                } else {
                    General.logWarn("SqliteMigrationService",
                        "No Settings on target backend after init() — cannot apply auth state");
                }
            } catch (e) {
                General.logError("SqliteMigrationService",
                    `Failed to apply auth state on target backend: ${e.message}`);
                throw e;
            }
        }
    }

    /**
     * Empty the backend we have just switched to, then seed baseline entitySyncStatus.
     *
     * Both halves matter. The target file is shared across users and is whatever the
     * last occupant left behind, so without the wipe a migration merges the new user's
     * data into the previous one's. And setup() only inserts rows that are MISSING, so
     * on a previously-used file every checkpoint survives at its old value and the
     * "re-pull everything" that follows silently degrades to a delta pull — which is
     * how a form element ends up referencing a concept that never arrives.
     *
     * Clearing entitiesLoadedFromServer() removes the EntitySyncStatus rows too, so the
     * subsequent setup() re-creates them all at REALLY_OLD_DATE. Only safe to call when
     * a full sync follows; never on the launch-time reconcile, which does not re-sync.
     */
    _resetTargetBackend() {
        try {
            const {EntityMetaData} = require('openchs-models');
            const entityService = this.getService('entityService');
            const entitySyncStatusService = this.getService('entitySyncStatusService');
            // The callers check the SOURCE outbox before switching; nothing checks the
            // target's. A target can hold unsynced records of its own — a migration that
            // switched and then failed leaves the user working on it — and the wipe would
            // take them with it, since entitiesLoadedFromServer() includes EntityQueue.
            // Uploaded-and-abandoned data is recoverable from the server; this is not, so
            // keep it and skip the wipe. Same call is made after the switch, so this reads
            // the target.
            const pendingOnTarget = this._getPendingFieldDataCount();
            if (pendingOnTarget > 0) {
                General.logWarn("SqliteMigrationService",
                    `Skipping target backend wipe: ${pendingOnTarget} unsynced local changes present there`);
            } else if (entityService && typeof entityService.clearDataIn === 'function') {
                General.logInfo("SqliteMigrationService", "Clearing target backend before migration sync");
                entityService.clearDataIn(EntityMetaData.entitiesLoadedFromServer());
            }
            if (entitySyncStatusService && typeof entitySyncStatusService.setup === 'function') {
                General.logInfo("SqliteMigrationService", "Seeding baseline entitySyncStatus on target backend");
                entitySyncStatusService.setup();
            }
        } catch (e) {
            General.logError("SqliteMigrationService",
                `Failed to reset target backend: ${e.message}`);
            throw e;
        }
    }

    _getPendingFieldDataCount() {
        const entityQueueService = this.getService('entityQueueService');
        return entityQueueService ? entityQueueService.getPendingFieldDataCount() : 0;
    }

    async _runSync(syncSource, callbacks) {
        // Late require to avoid circular dependency at module load time
        const SyncService = require('./SyncService').default;
        const {EntityMetaData} = require('openchs-models');

        const syncService = this.getService('syncService');

        const lockId = syncService.acquireLock();
        if (!lockId) {
            throw new Error("Sync lock already held — another sync is in progress");
        }
        try {
            const connectionInfo = {type: 'unknown'};
            const onProgress = (callbacks && callbacks.onProgress) || (() => {});
            const onMessage = (callbacks && callbacks.onMessage) || (() => {});
            await syncService.sync(
                lockId,
                EntityMetaData.model(),
                onProgress,
                onMessage,
                connectionInfo,
                Date.now(),
                syncSource,
                null
            );
            // NOTE: We intentionally do NOT call resetServicesAfterFullSyncCompletion here.
            // That method dispatches a 'RESET' action which clears the SyncComponent state
            // (including the `syncing` flag), causing the sync modal to disappear mid-flight.
            // The caller (SyncComponent._postSync) is responsible for invoking the reset
            // AFTER the user clicks OK on the post-migration "Sync Complete" dialog.
        } finally {
            syncService.releaseLock(lockId);
        }
    }

    /**
     * Run the state machine from the current phase to completion.
     * Each phase is idempotent so resume from any point is safe.
     *
     * @param {Object} state - current migration state from AsyncStorage
     * @param {Object} [callbacks] - optional progress/message callbacks
     */
    async resume(state, callbacks) {
        if (this._migrationInProgress) return;
        this._migrationInProgress = true;
        state.attemptCount = (state.attemptCount || 0) + 1;
        General.logInfo("SqliteMigrationService",
            `Resume from phase=${state.phase} attempt=${state.attemptCount} desired=${state.desiredBackend}`);

        const SyncService = require('./SyncService').default;
        const GlobalContext = require('../GlobalContext').default;
        const globalContext = GlobalContext.getInstance();

        try {
            if (state.phase === MIGRATION_PHASES.PENDING_UPLOAD) {
                const pendingCount = this._getPendingFieldDataCount();
                if (pendingCount > 0) {
                    General.logInfo("SqliteMigrationService",
                        `Uploading ${pendingCount} pending entities before backend switch`);
                    await this._runSync(SyncService.syncSources.ONLY_UPLOAD_BACKGROUND_JOB, callbacks);
                    // getUpdatedSyncSource escalates an upload-only sync to a full one after
                    // 12h, so the sync above may have switched the backend mid-flight and
                    // finalised the migration. Re-read before writing or we would clobber
                    // that back to pending_upload and re-run the whole migration next launch.
                    const stateAfterUpload = await this.getState();
                    if (stateAfterUpload.phase !== MIGRATION_PHASES.PENDING_UPLOAD) {
                        General.logInfo("SqliteMigrationService",
                            `Upload sync advanced the migration to phase=${stateAfterUpload.phase} — nothing more to do`);
                        return;
                    }
                    // Stop here even on a clean upload. The target sync pulls with the
                    // server's `now - 10s` upper bound, so records uploaded seconds ago
                    // fall outside it and would not come back on the new backend (#2006).
                    // Staying at PENDING_UPLOAD lets the next sync do the switch, by which
                    // point the upload is well inside the window.
                    General.logInfo("SqliteMigrationService",
                        `Deferring backend switch to the next sync — ${pendingCount} entities were just uploaded`);
                    stateAfterUpload.attemptCount = state.attemptCount;
                    stateAfterUpload.lastError = null;
                    await this.persistState(stateAfterUpload);
                    return;
                }
                General.logInfo("SqliteMigrationService", "No pending entities — skipping upload phase");
                // Capture only the per-user auth state from Settings on the source
                // backend. Everything else is bootstrapped on the target via
                // SettingsService.init() + the migration sync itself.
                const authState = this._captureAuthState();
                globalContext.switchBackend(state.desiredBackend);
                // Wipe whatever the previous occupant of this backend left, and seed
                // baseline checkpoints so the migration sync re-pulls from scratch.
                this._resetTargetBackend();
                // Bootstrap Settings on the target: run init() + apply captured auth.
                await this._bootstrapTargetSettings(authState);
                state.phase = MIGRATION_PHASES.PENDING_TARGET_SYNC;
                await this.persistState(state);
            }

            if (state.phase === MIGRATION_PHASES.PENDING_TARGET_SYNC) {
                General.logInfo("SqliteMigrationService",
                    `Running target sync on ${state.desiredBackend}`);
                // Ensure backend is currently active for the target (handles
                // resume after a crash where AsyncStorage state advanced but
                // GlobalContext booted into the source backend).
                if (globalContext.getActiveBackend() !== state.desiredBackend) {
                    // The source DB is abandoned by the switch, so anything still in its
                    // outbox exists nowhere else. Drop back a phase rather than lose it (#2006).
                    const pendingCount = this._getPendingFieldDataCount();
                    if (pendingCount > 0) {
                        General.logWarn("SqliteMigrationService",
                            `Backend switch aborted: ${pendingCount} local changes still awaiting upload`);
                        state.phase = MIGRATION_PHASES.PENDING_UPLOAD;
                        // Deferring is a normal outcome, not a failure — a stale lastError here
                        // would misreport why the migration is sitting still.
                        state.lastError = null;
                        await this.persistState(state);
                        return;
                    }
                    // Capture auth state from the source before switching
                    // (in case this is a resume after the previous attempt failed
                    // before the bootstrap step completed).
                    const authState = this._captureAuthState();
                    globalContext.switchBackend(state.desiredBackend);
                    this._resetTargetBackend();
                    await this._bootstrapTargetSettings(authState);
                } else {
                    // Already on target. Sanity check: if Settings is missing or
                    // has no auth, something went wrong with the previous bootstrap.
                    // Try to bootstrap again with whatever the source still has.
                    const settingsService = this.getService('settingsService');
                    const settings = settingsService ? settingsService.getSettings() : null;
                    if (!settings || !settings.idpType) {
                        General.logWarn("SqliteMigrationService",
                            "Target backend Settings missing or has no idpType — attempting bootstrap from source");
                        // We need to read auth state from the source backend, but we're
                        // already switched to target. Use globalContext.db (Realm) directly.
                        const sourceAuthState = this._captureAuthStateFromSource();
                        await this._bootstrapTargetSettings(sourceAuthState);
                    }
                }
                await this._runSync(SyncService.syncSources.SYNC_BUTTON, callbacks);
                state.phase = MIGRATION_PHASES.COMPLETING;
                state.activeBackend = state.desiredBackend;
                await this.persistState(state);
            }

            if (state.phase === MIGRATION_PHASES.COMPLETING) {
                state.phase = MIGRATION_PHASES.IDLE;
                state.lastError = null;
                await this.persistState(state);
                General.logInfo("SqliteMigrationService",
                    `Migration to ${state.activeBackend} complete`);
            }
        } catch (e) {
            state.lastError = e && e.message ? e.message : String(e);
            await this.persistState(state);
            General.logError("SqliteMigrationService",
                `Migration failed at phase=${state.phase} attempt=${state.attemptCount}: ${state.lastError}`);
            try {
                ErrorUtil.notifyBugsnag(
                    e instanceof Error ? e : new Error(state.lastError),
                    `SqliteMigrationService::${state.phase}::attempt${state.attemptCount}`
                );
            } catch (bugErr) {
                General.logError("SqliteMigrationService",
                    `Failed to notify Bugsnag: ${bugErr.message}`);
            }
            throw e;
        } finally {
            this._migrationInProgress = false;
        }
    }

    /**
     * Public read of the current state, primarily for the SyncComponent banner.
     */
    async getMigrationState() {
        return this.getState();
    }
}

export default SqliteMigrationService;
