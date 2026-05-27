import fs from 'react-native-fs';
import {unzip} from 'react-native-zip-archive';
import {open as openSqlite} from '@op-engineering/op-sqlite';
import _ from 'lodash';

import Service from '../framework/bean/Service';
import BaseService from './BaseService';
import SettingsService from './SettingsService';
import MediaService from './MediaService';
import EntitySyncStatusService from './EntitySyncStatusService';
import {get} from '../framework/http/requests';
import General from '../utility/General';
import SqliteFactory from '../framework/db/SqliteFactory';
import SqliteMigrationService, {
    BACKENDS,
    MIGRATION_PHASES,
} from './SqliteMigrationService';

/**
 * SQLite parallel to BackupRestoreRealmService for the fast-sync apply path.
 * Flow:
 *   1. Ask /media/mobileDatabaseSqliteSnapshotUrl/exists. Server returns false
 *      when the calling user isn't in the "SQLite Migration" group OR no
 *      snapshot has been generated for them yet. Either case → cb("restoreNoSqliteDump")
 *      and LoginActions falls through to the legacy Realm fast-sync path.
 *   2. Otherwise GET .../download → signed S3 URL → MediaService.downloadFromUrl.
 *   3. Unzip; find the single `.db` inside.
 *   4. Identity check: open the downloaded .db read-only, SELECT user_info.username,
 *      compare to Settings.userId. Reject on mismatch — defence-in-depth against
 *      a snapshot misrouting.
 *   5. Backup the live SQLite file, move the downloaded .db into place.
 *   6. Persist SqliteMigrationService state as {activeBackend: SQLITE, phase: IDLE}
 *      so resumeIfPending() on the next launch immediately switches the bean
 *      registry to SQLite without trying a Realm→SQLite migration.
 *   7. Callback to GlobalContext.onSqliteDatabaseRestored → reopen SQLite from
 *      the swapped file, flip _activeBackend, update bean registry.
 *   8. On any failure after step 5: restore the SQLite backup, notify
 *      GlobalContext to reinitialize, surface "restoreFailed" so the UI can
 *      offer Retry / Slow Sync.
 *
 * Unlike the Realm flow, this DOES NOT reset entity_sync_status to
 * REALLY_OLD_DATE — the whole value of the SQLite snapshot is its populated
 * loaded_since rows. And the device-local-only entities (drafts, MyGroups,
 * UserSubjectAssignment) don't exist in a server-generated snapshot, so no
 * cleanup pass is needed for them either.
 */
@Service('backupRestoreSqliteService')
export default class BackupRestoreSqliteService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    subscribeOnRestore(onRestoreCompleted) {
        this.onRestoreCompleted = onRestoreCompleted;
    }

    subscribeOnRestoreFailure(onRestoreFailure) {
        this.onRestoreFailure = onRestoreFailure;
    }

    /**
     * Returns a Promise that resolves when the restore attempt finishes (one
     * way or another). The cb signals state to the UI exactly like the Realm
     * service does:
     *   cb(percentProgress, message)              — progress
     *   cb(100, "restoreComplete")                 — SQLite snapshot applied
     *   cb(100, "restoreNoSqliteDump")             — no snapshot, fall through
     *   cb(100, "restoreFailed", true, error)      — apply failed, surface error
     */
    async restore(cb) {
        const settingsService = this.getService(SettingsService);
        const mediaService = this.getService(MediaService);
        const downloadedZip = `${fs.DocumentDirectoryPath}/${General.randomUUID()}.zip`;
        const unzipDir = `${fs.DocumentDirectoryPath}/${General.randomUUID()}`;
        const liveDbPath = SqliteFactory.getDbFullPath();
        const backupPath = `${liveDbPath}.backup`;

        // Capture auth state from the current (Realm-backed) Settings before
        // the file swap. The snapshot's Settings table only carries what
        // snapshot-server wrote — no idpType / userId / tokens — so without
        // overlaying after we flip to SQLite, LandingView reads idpType=null
        // and crashes.
        const authState = this._captureAuthState(settingsService);

        try {
            cb(1, 'restoreCheckDb');
            const existsResponse = await get(`${settingsService.getSettings().serverURL}/media/mobileDatabaseSqliteSnapshotUrl/exists`);
            if (existsResponse !== 'true') {
                General.logInfo('BackupRestoreSqliteService', 'No SQLite snapshot available; falling through');
                cb(100, 'restoreNoSqliteDump');
                return;
            }

            const url = await get(`${settingsService.getSettings().serverURL}/media/mobileDatabaseSqliteSnapshotUrl/download`);
            General.logDebug('BackupRestoreSqliteService', 'Downloading snapshot from signed URL');
            await mediaService.downloadFromUrl(url, downloadedZip, (received, total) => {
                cb(1 + (received * 80) / Math.max(total, 1), 'restoreDownloadPreparedDb');
            });

            cb(82, 'restoringDb');
            await unzip(downloadedZip, unzipDir);

            const entries = await fs.readDir(unzipDir);
            const dbEntry = _.find(entries, e => e.name.endsWith('.db'));
            if (!dbEntry) {
                throw new Error('SQLite snapshot zip did not contain a .db file');
            }

            cb(85, 'restoringDb');
            const snapshotUsername = await this._readSnapshotUsername(dbEntry.path, unzipDir);
            const expectedUsername = settingsService.getSettings().userId;
            if (!snapshotUsername || snapshotUsername !== expectedUsername) {
                throw new Error(
                    `SQLite snapshot user mismatch: snapshot.user_info.username='${snapshotUsername}', settings.userId='${expectedUsername}'`
                );
            }

            cb(88, 'restoringDb');
            if (await fs.exists(liveDbPath)) {
                await fs.copyFile(liveDbPath, backupPath);
                await fs.unlink(liveDbPath);
            }
            // -wal / -shm regenerate on first open; copy main file only.
            await fs.copyFile(dbEntry.path, liveDbPath);

            cb(92, 'restoringDb');
            await SqliteMigrationService.persistStateForUser(expectedUsername, {
                activeBackend: BACKENDS.SQLITE,
                desiredBackend: BACKENDS.SQLITE,
                phase: MIGRATION_PHASES.IDLE,
                startedAt: null,
                attemptCount: 0,
                lastError: null,
            });

            cb(94, 'restoringDb');
            if (this.onRestoreCompleted) {
                await this.onRestoreCompleted();
            }

            // Beans are now wired to SQLite. Two post-switch steps that mirror
            // SqliteMigrationService.resume() after switchBackend():
            // (1) seed baseline entity_sync_status rows for any
            //     entities-to-be-pulled that aren't already in the snapshot
            //     (idempotent — setup() only inserts when get() returns nil),
            //     otherwise ConventionalRestClient.getAllForEntity throws
            //     "Cannot read property 'loadedSince' of undefined".
            // (2) bootstrap Settings: init() (idempotent default seed) then
            //     overlay the captured auth state.
            this._seedEntitySyncStatusBaseline();
            await this._bootstrapTargetSettings(authState);

            await this._cleanup(downloadedZip, unzipDir, backupPath);
            cb(100, 'restoreComplete');
        } catch (error) {
            General.logErrorAsInfo('BackupRestoreSqliteService', error);
            await this._restoreBackup(liveDbPath, backupPath);
            await this._cleanup(downloadedZip, unzipDir);
            if (this.onRestoreFailure) {
                await this.onRestoreFailure();
            }
            cb(100, 'restoreFailed', true, error);
        }
    }

    // Mirrors SqliteMigrationService._seedEntitySyncStatusOnTargetBackend.
    // Idempotent: setup() only inserts REALLY_OLD_DATE rows for entities the
    // user can pull (no privilegeParam) AND that don't already have a row.
    // Existing snapshot rows with their loaded_since values are untouched.
    _seedEntitySyncStatusBaseline() {
        try {
            const entitySyncStatusService = this.getService(EntitySyncStatusService);
            if (entitySyncStatusService && typeof entitySyncStatusService.setup === 'function') {
                entitySyncStatusService.setup();
                General.logInfo('BackupRestoreSqliteService', 'Seeded baseline entity_sync_status on SQLite');
            }
        } catch (e) {
            General.logError('BackupRestoreSqliteService', `Failed to seed baseline entity_sync_status: ${e.message}`);
        }
    }

    // Mirrors SqliteMigrationService._captureAuthState — auth fields are the
    // only thing the snapshot's Settings table doesn't carry, so we must
    // carry them across the backend switch ourselves.
    _captureAuthState(settingsService) {
        try {
            const settings = settingsService?.getSettings?.();
            if (!settings) return null;
            return {
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
        } catch (e) {
            General.logWarn('BackupRestoreSqliteService', `Failed to capture auth state: ${e.message}`);
            return null;
        }
    }

    // Mirrors SqliteMigrationService._bootstrapTargetSettings:
    //   step 1 — settingsService.init() to ensure default Settings row exists
    //            on the now-active SQLite backend (idempotent).
    //   step 2 — overlay captured auth state (idpType, userId, tokens, …)
    //            onto that Settings row.
    // init() failure is logged but not thrown — the overlay can still
    // proceed if _seedSettings already inserted a row at SqliteFactory open.
    async _bootstrapTargetSettings(authState) {
        const settingsService = this.getService(SettingsService);
        if (!settingsService) {
            throw new Error('settingsService unavailable on SQLite backend');
        }
        try {
            if (typeof settingsService.init === 'function') {
                await settingsService.init();
            }
        } catch (e) {
            General.logWarn('BackupRestoreSqliteService', `SettingsService.init() on SQLite failed: ${e.message}`);
        }

        if (!authState) return;
        try {
            const current = settingsService.getSettings?.();
            if (!current) {
                General.logWarn('BackupRestoreSqliteService', 'No Settings on SQLite after init() — cannot apply auth state');
                return;
            }
            const updated = current.clone();
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
            General.logInfo('BackupRestoreSqliteService', `Restored auth state on SQLite (idpType=${updated.idpType})`);
        } catch (e) {
            General.logError('BackupRestoreSqliteService', `Failed to apply auth state on SQLite: ${e.message}`);
            throw e;
        }
    }

    async _readSnapshotUsername(dbFullPath, unzipDir) {
        const dbName = dbFullPath.substring(dbFullPath.lastIndexOf('/') + 1);
        const db = openSqlite({name: dbName, location: unzipDir, readOnly: true});
        try {
            const result = db.executeSync('SELECT username FROM user_info LIMIT 1');
            const row = result?.rows?.[0] ?? null;
            return row ? row.username : null;
        } finally {
            try { db.close(); } catch (_) { /* ignore */ }
        }
    }

    async _restoreBackup(liveDbPath, backupPath) {
        try {
            if (await fs.exists(backupPath)) {
                General.logInfo('BackupRestoreSqliteService', 'Restoring SQLite backup after failure');
                if (await fs.exists(liveDbPath)) await fs.unlink(liveDbPath);
                await fs.moveFile(backupPath, liveDbPath);
            }
        } catch (e) {
            General.logError('BackupRestoreSqliteService', `Failed to restore SQLite backup: ${e.message}`);
        }
    }

    async _cleanup(...paths) {
        for (const p of paths) {
            try {
                if (p && (await fs.exists(p))) await fs.unlink(p);
            } catch (e) {
                General.logWarn('BackupRestoreSqliteService', `Cleanup failed for ${p}: ${e.message}`);
            }
        }
    }
}
