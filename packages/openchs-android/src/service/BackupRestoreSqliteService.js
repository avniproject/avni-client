import fs from 'react-native-fs';
import {unzip, zip} from 'react-native-zip-archive';
import {open as openSqlite} from '@op-engineering/op-sqlite';
import _ from 'lodash';

import Service from '../framework/bean/Service';
import BaseService from './BaseService';
import SettingsService from './SettingsService';
import MediaService from './MediaService';
import GlobalContext from '../GlobalContext';
import MediaQueueService from './MediaQueueService';
import EntitySyncStatusService from './EntitySyncStatusService';
import {
    DraftEncounter,
    DraftEnrolment,
    DraftProgramEncounter,
    DraftSubject,
    EntitySyncStatus,
    IdentifierAssignment,
    MyGroups,
    UserInfo,
    UserSubjectAssignment
} from 'openchs-models';
import {removeBackupFile} from './BackupRestoreRealmService';
import UserInfoService from './UserInfoService';
import {get, getJSON} from '../framework/http/requests';
import General from '../utility/General';
import FileSystem from '../model/FileSystem';
import SqliteFactory from '../framework/db/SqliteFactory';
import SqliteMigrationService, {BACKENDS} from './SqliteMigrationService';
import toAvniError from '../framework/errorHandling/toAvniError';

const PER_USER_TIER = 'perUser';
const CATCHMENT_TIER = 'catchment';
const SNAPSHOT_TIER = 'snapshot';
const TIERS = [PER_USER_TIER, CATCHMENT_TIER, SNAPSHOT_TIER];

// Rows that belong to the device the dump was taken on, not to whoever restores it.
const PEER_OWNED_SCHEMAS = [
    MyGroups.schema.name,
    UserSubjectAssignment.schema.name,
    // Free identifiers are pre-allocated to the uploader's device; kept, both devices hand out
    // the same number and one registration overwrites the other.
    IdentifierAssignment.schema.name,
    DraftSubject.schema.name,
    DraftEncounter.schema.name,
    DraftEnrolment.schema.name,
    DraftProgramEncounter.schema.name,
];
// Checkpoints left over from the uploader's sync. UserInfo is here without being in the list
// above: _stampLocalIdentity rewrites that row deliberately, but the uploader's loaded_since
// would have /v2/me asked for changes newer than this user's own record, which never returns it.
export const PEER_OWNED_SYNC_STATUS_SCHEMAS = [
    MyGroups.schema.name,
    UserSubjectAssignment.schema.name,
    IdentifierAssignment.schema.name,
    UserInfo.schema.name,
];

/**
 * SQLite parallel to BackupRestoreRealmService for the fast-sync apply path.
 * Flow:
 *   1. Ask /media/fastSyncDownload/exists. Server returns false
 *      when the calling user isn't in the "SQLite Migration" group OR no
 *      snapshot has been generated for them yet. Either case → cb("restoreNoSqliteDump")
 *      and LoginActions falls through to the legacy Realm fast-sync path.
 *   2. Otherwise GET /media/fastSyncDownload → {url, tier} → MediaService.downloadFromUrl.
 *   3. Unzip; find the single `.db` inside.
 *   4. Identity: open the downloaded .db read-only and SELECT user_info.username. A per-user
 *      or snapshot artifact is generated for one user, so a mismatch with Settings.userId is
 *      a misrouting and is rejected; a catchment artifact is a peer's database by design, so
 *      its identity is corrected after the swap instead of asserted.
 *   5. Backup the live SQLite file, move the downloaded .db into place.
 *   6. Callback to GlobalContext.onSqliteDatabaseRestored → reopen SQLite from
 *      the swapped file, flip _activeBackend, update bean registry.
 *   7. Seed missing checkpoints and bootstrap Settings on SQLite.
 *   8. Only then commit SqliteMigrationService state as {activeBackend: SQLITE}, so the
 *      next launch's openCommittedBackend() opens SQLite directly. Written last, like the
 *      migration leg's commit, and a failed write fails the restore: a restore that fails
 *      before this point leaves nothing naming a database it never finished.
 *   9. On any failure after step 5: restore the SQLite backup, notify GlobalContext,
 *      which opens the backend the record still commits to, and surface "restoreFailed"
 *      so the UI can offer Retry / Slow Sync.
 *
 * Unlike the Realm flow, this DOES NOT reset entity_sync_status wholesale to
 * REALLY_OLD_DATE — the whole value of the SQLite dump is its populated
 * loaded_since rows. A perUser or snapshot artifact is server-generated and carries
 * no device-local rows, so it needs no cleanup beyond that. A catchment artifact is
 * a peer's live database, so it does: see _clearPeerOwnedData.
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

    backup(dumpType, cb) {
        const fileName = `${General.randomUUID()}.db`;
        const destFile = `${FileSystem.getBackupDir()}/${fileName}`;
        const destZipFile = `${destFile}.zip`;
        const mediaQueueService = this.getService(MediaQueueService);

        return Promise.resolve()
            .then(() => {
                // Taken from GlobalContext rather than this.db: a partly-failed backend switch can
                // leave _activeBackend reading SQLite while some beans still hold the Realm handle,
                // and a Realm file uploaded under a SQLite key would corrupt every device that
                // restored it. SqliteProxy.writeCopyTo already checkpoints the WAL and disables FK
                // enforcement, so the copy itself needs nothing further.
                const sqliteProxy = GlobalContext.getInstance().sqliteDb;
                if (!sqliteProxy) {
                    throw new Error('SQLite database is not open; refusing to upload a fast sync dump');
                }
                sqliteProxy.writeCopyTo({path: destFile});
            })
            .then(() => zip(destFile, destZipFile))
            .then(() => cb(10, "backupUploading"))
            .then(() => mediaQueueService.getDumpUploadUrl(dumpType, fileName))
            .then((url) => mediaQueueService.foregroundUpload(url, destZipFile, (written, total) => {
                cb(10 + (97 - 10) * (written / total), "backupUploading");
            }))
            .then(() => removeBackupFile(destFile))
            .then(() => removeBackupFile(destZipFile))
            .then(() => cb(100, "backupCompleted"))
            .catch((error) => {
                General.logError("BackupRestoreSqliteService", error);
                removeBackupFile(destFile).catch(() => {});
                removeBackupFile(destZipFile).catch(() => {});
                cb(100, "backupFailed", this._toAvniError(error));
            });
    }

    _toAvniError(error) {
        return toAvniError(error);
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
        await this._restore(cb, {commitsBackendState: true});
    }

    /**
     * The migration leg's entry point (SqliteMigrationService.prepareTarget). Same restore,
     * minus the state commit: commitLeg is the single writer of activeBackend there and runs
     * only once the whole sync has succeeded. The username comes from the leg because the
     * runtime is already on the target, whose Settings row is still the unbootstrapped default.
     *
     * Resolves true when a dump was applied, false when there is none or it could not be
     * applied — the leg then clears and seeds the target for a full pull, as it always did.
     */
    async restoreForMigration(username) {
        return this._restore(() => {}, {commitsBackendState: false, username});
    }

    async _restore(cb, {commitsBackendState, username}) {
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
        const localUsername = username || settingsService.getSettings().userId;
        // The rollback puts the file back but leaves nothing open on it, so a failure after this
        // point owes the caller a reopen and one before it does not.
        let liveDbClosed = false;

        try {
            cb(1, 'restoreCheckDb');
            const existsResponse = await get(`${settingsService.getSettings().serverURL}/media/fastSyncDownload/exists`);
            if (existsResponse !== 'true') {
                General.logInfo('BackupRestoreSqliteService', 'No fast sync database available; falling through');
                cb(100, 'restoreNoSqliteDump');
                return false;
            }

            const {url, tier} = await getJSON(`${settingsService.getSettings().serverURL}/media/fastSyncDownload`) || {};
            if (!url || !TIERS.includes(tier)) {
                throw new Error(`Fast sync download response is not usable: tier='${tier}'`);
            }
            General.logDebug('BackupRestoreSqliteService', `Downloading ${tier} fast sync database from signed URL`);
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
            const artifactUsername = await this._readSnapshotUsername(dbEntry.path, unzipDir);
            if (tier !== CATCHMENT_TIER && (!artifactUsername || artifactUsername !== localUsername)) {
                throw new Error(
                    `SQLite snapshot user mismatch: snapshot.user_info.username='${artifactUsername}', settings.userId='${localUsername}'`
                );
            }

            cb(88, 'restoringDb');
            // Close before the file moves, not after. The open connection's own close would
            // otherwise run against the swapped-in snapshot's path, and the backup copied
            // below would be missing whatever was still only in the WAL.
            this._closeLiveSqlite();
            liveDbClosed = true;
            if (await fs.exists(liveDbPath)) {
                await fs.copyFile(liveDbPath, backupPath);
                await fs.unlink(liveDbPath);
            }
            await this._removeSidecars(liveDbPath);
            // -wal / -shm regenerate on first open; copy main file only.
            await fs.copyFile(dbEntry.path, liveDbPath);

            cb(92, 'restoringDb');
            if (this.onRestoreCompleted) {
                // false means the snapshot file is in place but SQLite would not open on it,
                // so the runtime has fallen back to Realm. Everything below assumes the beans
                // are on SQLite — without this the user is told the restore worked and then
                // finds sync blocked by the mismatch with the commitStateForUser record below.
                const reopened = await this.onRestoreCompleted();
                if (reopened === false) {
                    throw new Error('SQLite snapshot applied but the database could not be reopened');
                }
            }

            // Beans are now wired to SQLite. Two post-switch steps that mirror
            // the migration leg after it moves the runtime:
            // (1) seed baseline entity_sync_status rows for any
            //     entities-to-be-pulled that aren't already in the snapshot
            //     (idempotent — setup() only inserts when get() returns nil),
            //     otherwise ConventionalRestClient.getAllForEntity throws
            //     "Cannot read property 'loadedSince' of undefined".
            // (2) bootstrap Settings: init() (idempotent default seed) then
            //     overlay the captured auth state.

            // Before the seeding, not after: the seed only inserts a baseline row where none
            // exists, so the uploader's rows for the cleared entities have to be gone by then.
            const clearedPeerOwnedData = tier === CATCHMENT_TIER;
            if (clearedPeerOwnedData) {
                this._clearPeerOwnedData();
            }
            this._seedEntitySyncStatusBaseline({mustSucceed: clearedPeerOwnedData});
            await this._bootstrapTargetSettings(authState);
            if (tier === CATCHMENT_TIER) {
                this._stampLocalIdentity(localUsername);
            }

            // Recorded last, once the restored database is usable (step 8 above). Throws if
            // the write fails, which takes the failure path below.
            if (commitsBackendState) {
                cb(96, 'restoringDb');
                await SqliteMigrationService.commitStateForUser(localUsername, {
                    activeBackend: BACKENDS.SQLITE,
                    desiredBackend: BACKENDS.SQLITE,
                    preparedTarget: null,
                    startedAt: null,
                    attemptCount: 0,
                    lastError: null,
                });
            }

            await this._cleanup(downloadedZip, unzipDir, backupPath);
            cb(100, 'restoreComplete');
            return true;
        } catch (error) {
            General.logErrorAsInfo('BackupRestoreSqliteService', error);
            await this._restoreBackup(liveDbPath, backupPath);
            await this._cleanup(downloadedZip, unzipDir);
            // A leg must stay on its target: onRestoreFailure opens the committed backend, which
            // mid-migration is the source, and the leg's full-pull fallback would then clear it.
            if (!commitsBackendState) {
                if (liveDbClosed) await this._reopenRolledBackDatabase();
                return false;
            }
            if (this.onRestoreFailure) {
                // cb must fire whatever happens here, or login waits on the restore forever.
                try {
                    await this.onRestoreFailure();
                } catch (e) {
                    General.logError('BackupRestoreSqliteService', `Restore-failure handler failed: ${e.message}`);
                }
            }
            cb(100, 'restoreFailed', true, error);
            return false;
        }
    }

    // Same callback as the success path: the file in place is once more what the runtime should
    // be open on, and the beans are still holding the connection _closeLiveSqlite dropped.
    async _reopenRolledBackDatabase() {
        if (!this.onRestoreCompleted) return;
        try {
            const reopened = await this.onRestoreCompleted();
            if (reopened === false) {
                General.logError('BackupRestoreSqliteService',
                    'Rolled the fast sync dump back but SQLite would not reopen');
            }
        } catch (e) {
            General.logError('BackupRestoreSqliteService', `Reopening the rolled-back database failed: ${e.message}`);
        }
    }

    // A catchment dump is another field worker's live database, so it carries their group
    // memberships, subject assignments and unsaved drafts. Realm clears the equivalent after its
    // swap (_deleteUserGroups / _deleteUserSubjectAssignments / _deleteDrafts); here the sync
    // status must go too, because this flow otherwise keeps loaded_since and the next sync would
    // never re-pull what was deleted. Failing here fails the restore — running on a peer's
    // memberships is worse than not restoring.
    _clearPeerOwnedData() {
        const sqliteProxy = GlobalContext.getInstance().sqliteDb;
        if (!sqliteProxy) {
            throw new Error('SQLite database is not open; refusing to run a catchment dump uncleaned');
        }
        sqliteProxy.write(() => {
            PEER_OWNED_SCHEMAS.forEach(schemaName => sqliteProxy.deleteAllInSchema(schemaName));
            const staleSyncStatuses = _.flatMap(PEER_OWNED_SYNC_STATUS_SCHEMAS, schemaName =>
                sqliteProxy.objects(EntitySyncStatus.schema.name)
                    .filtered('entityName = $0', schemaName)
                    .slice());
            sqliteProxy.delete(staleSyncStatuses);
        });
        General.logInfo('BackupRestoreSqliteService', 'Cleared the uploader\'s device-local rows from the catchment dump');
    }

    // A catchment dump carries the uploader's user_info row. Realm has always corrected this after
    // the swap rather than rejecting the dump (BackupRestoreRealmService._restoreUserInfo); without
    // it the device would run as the uploader.
    _stampLocalIdentity(username) {
        const userInfoService = this.getService(UserInfoService);
        const existing = userInfoService.getUserInfo();
        userInfoService.saveOrUpdate(UserInfo.fromResource({
            username,
            organisationName: _.get(existing, 'organisationName') || 'dummy',
            name: username
        }));
    }

    // Mirrors the seeding half of SqliteMigrationService.prepareTarget — but NOT
    // the wipe: the snapshot file is intentionally pre-populated.
    // Idempotent: setup() only inserts REALLY_OLD_DATE rows for entities the
    // user can pull (no privilegeParam) AND that don't already have a row.
    // Existing snapshot rows with their loaded_since values are untouched.
    _seedEntitySyncStatusBaseline({mustSucceed = false} = {}) {
        try {
            const entitySyncStatusService = this.getService(EntitySyncStatusService);
            if (entitySyncStatusService && typeof entitySyncStatusService.setup === 'function') {
                entitySyncStatusService.setup();
                General.logInfo('BackupRestoreSqliteService', 'Seeded baseline entity_sync_status on SQLite');
            }
        } catch (e) {
            General.logError('BackupRestoreSqliteService', `Failed to seed baseline entity_sync_status: ${e.message}`);
            // _clearPeerOwnedData deleted rows on the promise that this re-creates them. Without
            // them the next sync destructures loadedSince off undefined and aborts entirely, and
            // only the next app launch repairs it — so fail the restore and roll the file back.
            if (mustSucceed) throw e;
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
                this._closeLiveSqlite();
                if (await fs.exists(liveDbPath)) await fs.unlink(liveDbPath);
                await this._removeSidecars(liveDbPath);
                await fs.moveFile(backupPath, liveDbPath);
            }
        } catch (e) {
            General.logError('BackupRestoreSqliteService', `Failed to restore SQLite backup: ${e.message}`);
        }
    }

    // Whoever closes it drops the reference: reinitializeDatabase skips its own close when the
    // handle is gone, and nothing may be handed a closed database in between.
    _closeLiveSqlite() {
        const globalContext = require('../GlobalContext').default.getInstance();
        if (!globalContext.sqliteDb) return;
        try {
            globalContext.sqliteDb.close();
        } catch (e) {
            General.logWarn('BackupRestoreSqliteService', `Closing the live SQLite connection failed: ${e.message}`);
        }
        globalContext.sqliteDb = null;
    }

    // -wal and -shm belong to the file they were written beside. Left next to a different one
    // they are read as its own, and the open fails or the database reads as corrupt.
    async _removeSidecars(dbPath) {
        await this._cleanup(`${dbPath}-wal`, `${dbPath}-shm`);
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
