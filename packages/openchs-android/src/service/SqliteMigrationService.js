import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import General from "../utility/General";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import SessionUsername from "./SessionUsername";
import {BACKENDS} from "../framework/BackendTypes";

// Note: Other services are looked up via this.getService(name) (string-based) to avoid
// circular import chains during module load. EntityMetaData and GlobalContext are required
// lazily inside the methods that use them.

/**
 * SqliteMigrationService
 *
 * Drives the per-user switch between Realm and SQLite, based on membership in the
 * well-known "SQLite Migration" server group, delivered via the existing MyGroups sync
 * entity — no new server contracts.
 *
 * The switch is one leg inside a sync the user started (SyncService._checkAndSwitchBackendMidSync):
 * open the leg, move the runtime to the target, prepare it, pull, catch up, commit. The
 * per-user state record in AsyncStorage holds the committed activeBackend, the
 * desiredBackend the group names, and preparedTarget, which marks a target wiped and seeded
 * by an attempt still in progress. activeBackend is written once per migration, by
 * commitLeg, after the sync succeeds; until then the app boots the complete source backend.
 * A failed leg puts the runtime back and records diagnostics only; the next sync carries on.
 * Failures are reported to BOTH Bugsnag and General.logError so users can upload logs.
 */

export const SQLITE_MIGRATION_GROUP_UUID = "e6e5e4e3-e2e1-4f00-8000-d0d1d2d3d4d5";
export const SQLITE_MIGRATION_GROUP_NAME = "SQLite Migration";

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
        preparedTarget: null,
        startedAt: null,
        attemptCount: 0,
        lastError: null,
    };
}

@Service('sqliteMigrationService')
class SqliteMigrationService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this._openLeg = null;
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
     * Whether a switch is owed: the stored target, or the group membership the active
     * database holds, differs from the committed backend. The background job (#2118)
     * stays idle while this is true.
     */
    async isMigrationPending() {
        try {
            const state = await this.getState();
            return state.desiredBackend !== state.activeBackend
                || this.computeDesiredBackend() !== state.activeBackend;
        } catch (e) {
            return false;
        }
    }

    // Every full sync records the target the server group names, so the decision survives
    // a crash and never has to be re-derived from a target whose MyGroups has not arrived.
    // A target that matches the committed backend again abandons any attempt in progress,
    // so a later attempt starts from a wipe rather than from that attempt's checkpoints.
    async recordDesiredBackend(desired) {
        const username = await this._getCurrentUsername();
        const state = await SqliteMigrationService.readStateForUser(username);
        const abandonsAttempt = desired === state.activeBackend && !_.isNil(state.preparedTarget);
        if (state.desiredBackend === desired && !abandonsAttempt) return state;
        const updated = {
            ...state,
            desiredBackend: desired,
            preparedTarget: abandonsAttempt ? null : state.preparedTarget,
        };
        await SqliteMigrationService.persistStateForUser(username, updated);
        return updated;
    }

    // Boot opens the backend the state record commits to. An unfinished leg committed
    // nothing, so an interrupted migration boots on the complete source backend and waits
    // for the next sync the user starts. Never wipes, never syncs.
    async reconcileBackendOnLaunch() {
        const state = await this.getState();
        const GlobalContext = require('../GlobalContext').default;
        const globalContext = GlobalContext.getInstance();
        if (globalContext.getActiveBackend() !== state.activeBackend) {
            General.logInfo("SqliteMigrationService",
                `Opening the committed backend on launch: ${state.activeBackend}`);
            globalContext.switchBackend(state.activeBackend);
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
     * Falls back gracefully if any step fails — the sync would then surface an auth
     * error, the leg fails, and the next sync retries.
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

    _getPendingFieldDataCount() {
        const entityQueueService = this.getService('entityQueueService');
        return entityQueueService ? entityQueueService.getPendingFieldDataCount() : 0;
    }

    // Opens a migration leg. The username is resolved here, while the committed backend is
    // still active, because the target's UserInfo is empty or wiped once the runtime moves.
    // Writes diagnostics and the target only; activeBackend waits for commitLeg.
    async beginLeg(target) {
        if (this._openLeg) {
            throw new Error(`A migration leg to ${this._openLeg.target} is already open`);
        }
        const username = await this._getCurrentUsername();
        const state = await SqliteMigrationService.readStateForUser(username);
        const attemptCount = (state.attemptCount || 0) + 1;
        await SqliteMigrationService.persistStateForUser(username, {
            ...state,
            desiredBackend: target,
            startedAt: state.startedAt || Date.now(),
            attemptCount,
        });
        const leg = {username, source: state.activeBackend, target};
        this._openLeg = leg;
        General.logInfo("SqliteMigrationService",
            `Migration leg opened: ${leg.source} → ${target}, attempt=${attemptCount}`);
        return leg;
    }

    /**
     * Called once the runtime is on the leg's target. A first attempt empties what the
     * file's previous occupant left, seeds every checkpoint at REALLY_OLD_DATE, and records
     * the target as prepared. Re-entry — the record already names this target — leaves the
     * target and its checkpoints alone, so the pull carries on from where it stopped.
     *
     * The marker decides, not the presence of checkpoint rows. A backend this user left
     * after an earlier completed move still holds rows at their old values, and a delta pull
     * from them — with the leg marking every ResetSync migrated (#2057) — would skip resets
     * issued since. The marker is written only after the wipe and seed succeed and cleared
     * by the commit, so it names exactly an attempt whose target was rebuilt from empty.
     */
    async prepareTarget(leg) {
        const state = await SqliteMigrationService.readStateForUser(leg.username);
        if (state.preparedTarget === leg.target) {
            General.logInfo("SqliteMigrationService",
                `Re-entering the migration to ${leg.target}: carrying on from its checkpoints`);
            // Only inserts rows that are missing, e.g. entities added by an app update.
            this.getService('entitySyncStatusService').setup();
            return true;
        }
        await this.restartTarget(leg);
        return false;
    }

    // Empties the target, seeds every checkpoint at REALLY_OLD_DATE, and marks it prepared. A
    // first attempt does this; so does a re-entry that finds a reset issued since the attempt
    // began, because the leg marks resets migrated without applying them.
    async restartTarget(leg) {
        // Every backend is left with an empty outbox — the switch refuses otherwise — so
        // unsynced records here mean an invariant broke, and the wipe would take the only copy.
        const pendingOnTarget = this._getPendingFieldDataCount();
        if (pendingOnTarget > 0) {
            throw new Error(`Target backend ${leg.target} holds ${pendingOnTarget} unsynced local changes; refusing to wipe it`);
        }
        const {EntityMetaData} = require('openchs-models');
        General.logInfo("SqliteMigrationService", `Clearing and seeding ${leg.target} for a full pull`);
        this.getService('entityService').clearDataIn(EntityMetaData.entitiesLoadedFromServer());
        this.getService('entitySyncStatusService').setup();
        const state = await SqliteMigrationService.readStateForUser(leg.username);
        await SqliteMigrationService.persistStateForUser(leg.username, {...state, preparedTarget: leg.target});
    }

    // The single writer of activeBackend. Throws when the write fails: a leg that cannot
    // record its completion must fail, so the runtime returns to what the next launch opens.
    async commitLeg(leg) {
        const state = await SqliteMigrationService.readStateForUser(leg.username);
        await AsyncStorage.setItem(asyncStorageKey(leg.username), JSON.stringify({
            ...state,
            activeBackend: leg.target,
            desiredBackend: leg.target,
            preparedTarget: null,
            startedAt: null,
            attemptCount: 0,
            lastError: null,
        }));
        this._openLeg = null;
        General.logInfo("SqliteMigrationService",
            `Migration to ${leg.target} committed after ${state.attemptCount} attempt(s)`);
    }

    // Failure anywhere in the leg: put the runtime back on the backend the leg started from,
    // and record diagnostics only. That source is still the committed backend — only
    // commitLeg writes activeBackend, and a failed commit wrote nothing — and it comes from the
    // leg rather than a fresh read, because a failed read returns defaults that name Realm.
    // Never throws; the caller rethrows its own error so the sync fails.
    async abandonOpenLeg(error) {
        const leg = this._openLeg;
        if (!leg) return;
        this._openLeg = null;
        const message = error && error.message ? error.message : String(error);
        try {
            const GlobalContext = require('../GlobalContext').default;
            GlobalContext.getInstance().switchBackend(leg.source);
            General.logError("SqliteMigrationService",
                `Migration to ${leg.target} failed; back on ${leg.source}: ${message}`);
            ErrorUtil.notifyBugsnag(error instanceof Error ? error : new Error(message),
                `SqliteMigrationService::leg::${leg.source}->${leg.target}`);
            // Only over a record we could actually read; never write defaults back.
            const raw = await AsyncStorage.getItem(asyncStorageKey(leg.username));
            if (raw) {
                await SqliteMigrationService.persistStateForUser(leg.username, {...JSON.parse(raw), lastError: message});
            }
        } catch (e) {
            General.logError("SqliteMigrationService", `Failed to abandon the migration leg: ${e.message}`);
        }
    }
}

export default SqliteMigrationService;
