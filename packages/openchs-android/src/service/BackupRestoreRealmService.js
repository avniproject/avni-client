import {
    EntitySyncStatus,
    IdentifierAssignment,
    UserInfo,
    Concept,
    MyGroups,
    UserSubjectAssignment,
    DraftSubject,
    DraftEncounter
} from 'openchs-models';
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import fs from 'react-native-fs';
import {unzip, zip} from 'react-native-zip-archive';
import Service from "../framework/bean/Service";
import BaseService from "../service/BaseService";
import MediaQueueService from "../service/MediaQueueService";
import {get} from '../framework/http/requests';
import SettingsService from "../service/SettingsService";
import MediaService from "./MediaService";
import _ from 'lodash';
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SubjectTypeService from "./SubjectTypeService";
import IndividualService from "./IndividualService";
import SubjectMigrationService from "./SubjectMigrationService";
import FormMappingService from "./FormMappingService";
import UserInfoService from './UserInfoService';
import moment from "moment";
import FileLoggerService from '../utility/FileLoggerService';

const REALM_FILE_NAME = "default.realm";
const REALM_FILE_FULL_PATH = `${fs.DocumentDirectoryPath}/${REALM_FILE_NAME}`;
const BACKUP_LOG_FILE = `${FileSystem.getBackupDir()}/avni.log`;

@Service("backupRestoreRealmService")
export default class BackupRestoreRealmService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    subscribeOnRestore(dumpFileRestoreCompleted) {
        this.dumpFileRestoreCompleted = dumpFileRestoreCompleted;
    }

    subscribeOnRestoreFailure(onRestoreFailure) {
        this.onRestoreFailure = onRestoreFailure;
    }

    isDatabaseEverSynced() {
        return !this.isDatabaseNeverSynced();
    }

    isDatabaseNeverSynced() {
        let entityService = this.getService(EntityService);
        let entityTypeWhichWouldHaveAtLeastOneEntityInAllImplementationsAndIsQuiteEarlyInSyncCycle = Concept;
        let anEntity = entityService.findOnly(entityTypeWhichWouldHaveAtLeastOneEntityInAllImplementationsAndIsQuiteEarlyInSyncCycle.schema.name);
        return _.isNil(anEntity);
    }

    backup(dumpType, cb, providedUsername = null) {
        const fileName = dumpType === MediaQueueService.DumpType.Adhoc ? `adhoc-${General.randomUUID()}.realm` : `${General.randomUUID()}.realm`;

        let destFile = `${FileSystem.getBackupDir()}/${fileName}`;
        let destZipFile = `${FileSystem.getBackupDir()}/${fileName}.zip`;
        let mediaQueueService = this.getService(MediaQueueService);
        const fileLoggerService = new FileLoggerService();
        General.logInfo("BackupRestoreRealmService", `Dest: ${destFile}`);
        
        // Try to backup realm database
        try {
            this.db.writeCopyTo({path: destFile});
            return this._performFullBackup(destFile, destZipFile, fileLoggerService, mediaQueueService, dumpType, cb, providedUsername);
        } catch (error) {
            General.logWarn("BackupRestoreRealmService", `Cannot backup realm database: ${error.message}. Falling back to logs-only backup.`);
            return this._performLogsOnlyBackup(destFile, destZipFile, fileLoggerService, mediaQueueService, dumpType, cb, providedUsername);
        }
    }

    _performFullBackup(destFile, destZipFile, fileLoggerService, mediaQueueService, dumpType, cb, providedUsername = null) {
        const username = this._getUsernameForBackup(providedUsername);
        const uploadFileName = `adhoc-dump-as-zip-${username}-${General.randomUUID()}`;
        
        return this._prepareBackupFiles(destFile, fileLoggerService)
            .then((filesToZip) => zip(filesToZip, destZipFile))
            .then(() => {
                General.logDebug("BackupRestoreRealmService", "Getting upload location");
                cb(10, "backupUploading");
            })
            .then(() => mediaQueueService.getDumpUploadUrl(dumpType, uploadFileName))
            .then((url) => mediaQueueService.foregroundUpload(url, destZipFile, (written, total) => {
                General.logDebug("BackupRestoreRealmService", `Upload in progress ${written}/${total}`);
                cb(10 + (97 - 10) * (written / total), "backupUploading");
            }))
            .then(() => {
                General.logDebug("BackupRestoreRealmService", "Removing database backup file created");
                cb(97, "backupUploading");
            })
            .then(() => this._cleanupBackupFiles(destFile))
            .then(() => {
                General.logDebug("BackupRestoreRealmService", "Removing database backup compressed file created");
                cb(99, "backupUploading");
            })
            .then(() => removeBackupFile(destZipFile))
            .then(() => cb(100, "backupCompleted"))
            .catch((error) => {
                General.logError("BackupRestoreRealmService", error);
                // Clean up files on error
                removeBackupFile(destZipFile).catch(() => {});
                this._cleanupBackupFiles(destFile).catch(() => {});
                cb(100, "backupFailed");
            });
    }

    _performLogsOnlyBackup(destFile, destZipFile, fileLoggerService, mediaQueueService, dumpType, cb, providedUsername = null) {
        // Create logs-only backup without realm database
        const logsOnlyFileName = destFile.replace('.realm', '-logs-only.zip');
        
        // Get username from login input or fallback
        const username = this._getUsernameForBackup(providedUsername);
        
        // Get server URL from app config (fixed in APK)
        const serverUrl = this._getServerUrl();
        
        if (!serverUrl) {
            General.logError("BackupRestoreRealmService", "No server URL available for logs-only backup");
            cb(100, "backupFailed");
            return;
        }
        
        return this._prepareLogsOnlyBackup(fileLoggerService)
            .then((filesToZip) => zip(filesToZip, logsOnlyFileName))
            .then(() => {
                General.logDebug("BackupRestoreRealmService", "Logs-only backup created locally");
                cb(10, "backupUploading");
                const uploadUrl = `${serverUrl}/media/uploadUrl/adhoc-logs-only-${username}-${General.randomUUID()}`;
                return get(uploadUrl)
                    .then((url) => mediaQueueService.foregroundUpload(url, logsOnlyFileName, (written, total) => {
                        General.logDebug("BackupRestoreRealmService", `Logs-only upload in progress ${written}/${total}`);
                        cb(10 + (97 - 10) * (written / total), "backupUploading");
                    }))
                    .then(() => {
                        General.logDebug("BackupRestoreRealmService", "Removing logs-only backup file created");
                        cb(97, "backupUploading");
                    })
                    .then(() => removeBackupFile(logsOnlyFileName))
                    .then(() => cb(100, "backupCompleted"));
            })
            .catch((error) => {
                General.logError("BackupRestoreRealmService", `Logs-only backup failed: ${error.message}`);
                // Clean up files on error
                removeBackupFile(logsOnlyFileName).catch(() => {});
                cb(100, "backupFailed");
            });
    }

    _getUsernameForBackup(providedUsername = null) {
        // Priority 1: Use provided username from login form (user input) - avoids realm access during login flow
        if (providedUsername && providedUsername.trim()) {
            return providedUsername.trim();
        }
        
        // Priority 2: Try realm username (for non-login flows where user is already logged in)
        try {
            const realmUsername = _.get(this.getService(UserInfoService).getUserInfo(), 'username');
            if (realmUsername && realmUsername.trim()) {
                return realmUsername.trim();
            }
        } catch (error) {
            General.logWarn("BackupRestoreRealmService", `Cannot get username from realm: ${error.message}.`);
        }
        
        // Final fallback
        return "unknown-user";
    }

    _getServerUrl() {
        // Get server URL from app config (fixed in APK)
        const Config = require('../framework/Config');
        return Config.SERVER_URL;
    }

    restore(cb) {
        let settingsService = this.getService(SettingsService);
        let mediaService = this.getService(MediaService);
        let entitySyncStatusService = this.getService(EntitySyncStatusService);
        let downloadedFile = `${fs.DocumentDirectoryPath}/${General.randomUUID()}.zip`;
        let downloadedUncompressedDir = `${fs.DocumentDirectoryPath}/${General.randomUUID()}`;
        const realmBackupPath = `${REALM_FILE_FULL_PATH}.backup`;
        const prevSettings = this.getPreviousSettings(settingsService);
        const prevUserInfo = UserInfo.fromResource({username: prevSettings.userId, organisationName: 'dummy', name: prevSettings.userId});

        // Helper to restore original realm on failure
        const restoreOriginalRealm = async () => {
            try {
                const backupExists = await fs.exists(realmBackupPath);
                if (backupExists) {
                    General.logInfo("BackupRestoreRealmService", "Restoring original realm from backup");
                    await fs.unlink(REALM_FILE_FULL_PATH).catch(() => {});
                    await fs.moveFile(realmBackupPath, REALM_FILE_FULL_PATH);
                }
            } catch (e) {
                General.logError("BackupRestoreRealmService", `Failed to restore original realm: ${e.message}`);
            }
        };

        // Helper to cleanup downloaded files
        const cleanupDownloadedFiles = async () => {
            await removeBackupFile(downloadedFile);
            await removeBackupFile(downloadedUncompressedDir);
            await removeBackupFile(realmBackupPath);
        };

        General.logInfo("BackupRestoreRealmService", `To be downloaded file: ${downloadedFile}, Unzipped directory: ${downloadedUncompressedDir}, Realm file: ${REALM_FILE_FULL_PATH}`);

        cb(1, "restoreCheckDb");
        return get(`${settingsService.getSettings().serverURL}/media/mobileDatabaseBackupUrl/exists`)
            .then((exists) => {
                General.logDebug("BackupRestoreRealmService", `Backup file exists:${exists}`);
                if (exists === "true") {
                    get(`${settingsService.getSettings().serverURL}/media/mobileDatabaseBackupUrl/download`)
                        .then((url) => mediaService.downloadFromUrl(url, downloadedFile, (received, total) => {
                            cb(1 + (received * 85) / total, "restoreDownloadPreparedDb")
                        }))
                        .then(() => {
                            General.logDebug("BackupRestoreRealmService", "Decompressing downloaded database dump");
                            cb(87, "restoringDb");
                        })
                        .then(() => unzip(downloadedFile, downloadedUncompressedDir))
                        .then(() => {
                            General.logDebug("BackupRestoreRealmService", "Backing up local database before replacing");
                            cb(89, "restoringDb");
                        })
                        .then(() => fs.exists(REALM_FILE_FULL_PATH))
                        .then(async (exists) => {
                            if (exists) {
                                // Backup original realm instead of deleting
                                await fs.copyFile(REALM_FILE_FULL_PATH, realmBackupPath);
                                await fs.unlink(REALM_FILE_FULL_PATH);
                            }
                        })
                        .then(() => {
                            General.logDebug("BackupRestoreRealmService", "Create database from downloaded file");
                            cb(90, "restoringDb");
                        })
                        .then(() => fs.readDir(downloadedUncompressedDir))
                        .then((files) => _.find(files, (file) => file.name.endsWith("realm")).path)
                        .then((fullFilePath) => {
                            General.logInfo("BackupRestoreRealmService", `Replacing realm file with: ${fullFilePath}`);
                            return fs.copyFile(fullFilePath, REALM_FILE_FULL_PATH);
                        })
                        .then(() => {
                            cb(91, "restoringDb");
                        })
                        .then(() => {
                            General.logDebug("BackupRestoreRealmService", "Migrating database");
                            cb(92, `Upgrading database. May take upto 5 minutes on slow devices. Start Time: ${moment().format("hh:mm")}`);
                        })
                        .then(() => this.dumpFileRestoreCompleted())
                        .then(() => {
                            General.logDebug("BackupRestoreRealmService", "Removing downloaded files");
                            cb(94, "restoringDb");
                        })
                        .then(() => entitySyncStatusService.setup())
                        .then(() => cleanupDownloadedFiles())
                        .then(() => {
                            General.logDebug("BackupRestoreRealmService", "Personalising database");
                            cb(97, "restoringDb");
                        })
                        .then(() => {
                            this._restoreSettings(prevSettings);
                            General.logDebug("BackupRestoreRealmService", "Restoring prev settings to revert any changes" +
                            " caused due to fast sync restore from a different environment");
                        })
                        .then(() => {
                            this._deleteUserInfoAndIdAssignment();
                            General.logDebug("BackupRestoreRealmService", "Deleted user info and id assignment");
                        })
                        .then(() => {
                            this._deleteDrafts();
                            General.logDebug("BackupRestoreRealmService", "Deleted drafts");
                        })
                        .then(() => {
                            this._restoreUserInfo(prevUserInfo);
                            General.logDebug("BackupRestoreRealmService", "Restoring prev userInfo to ensure we have user details" +
                              " immediately after fast sync restore");
                        })
                        .then(() => {
                            this._deleteUserGroups();
                            General.logDebug("BackupRestoreRealmService", "Deleted user groups");
                        })
                        .then(() => {
                            this._deleteUserSubjectAssignments();
                            General.logDebug("BackupRestoreRealmService", "Deleted user subject assignments");
                        })
                        .then(() => {
                            this._deleteIndividualAndDependentForDirectlyAssignableSubjectTypes();
                            General.logDebug("BackupRestoreRealmService", "Deleted individual and dependent forDirectlyAssignableSubjectTypes");
                        })
                        .then(() => {
                            General.logDebug("BackupRestoreRealmService", "Personalisation of database complete");
                            cb(100, "restoreComplete");
                        })
                        .catch(async (error) => {
                            General.logErrorAsInfo("BackupRestoreRealmService", error);
                            // Sequence is critical: restore realm file first, then cleanup, then reinitialize
                            // 1. Restore original realm file to disk
                            await restoreOriginalRealm();
                            // 2. Cleanup downloaded files
                            await removeBackupFile(downloadedFile);
                            await removeBackupFile(downloadedUncompressedDir);
                            // 3. Reinitialize database connection (must happen after realm file is restored)
                            if (this.onRestoreFailure) {
                                await this.onRestoreFailure();
                            }
                            cb(100, "restoreFailed", true, error);
                        });
                } else {
                    cb(100, "restoreNoDump");
                }
            })
            .catch((error) => {
                General.logErrorAsInfo("BackupRestoreRealmService", error);
                cb(100, "restoreFailed", true, error);
            });
    }

    getPreviousSettings(settingsService) {
        const prevSettings = settingsService.getSettings().clone();
        prevSettings.locale = null;
        return prevSettings;
    }

    _deleteUserInfoAndIdAssignment() {
        this._deleteAndResetSync(UserInfo.schema.name);
        this._deleteAndResetSync(IdentifierAssignment.schema.name);
    }

    _deleteDrafts() {
        this._deleteAndResetSync(DraftEncounter.schema.name);
        this._deleteAndResetSync(DraftSubject.schema.name);
    }

    _deleteUserGroups() {
        this._deleteAndResetSync(MyGroups.schema.name);
    }

    _deleteUserSubjectAssignments() {
        this._deleteAndResetSync(UserSubjectAssignment.schema.name);
    }

    _deleteAndResetSync(schemaName) {
        const db = this.db;
        const syncStatuses = db.objects(EntitySyncStatus.schema.name)
            .filtered(`entityName = '${schemaName}'`)
            .map(_.identity);
        this.db.write(() => {
            db.delete(db.objects(schemaName));
            syncStatuses.forEach(({uuid, entityName, entityTypeUuid}) => {
                const updatedEntity = EntitySyncStatus.create(entityName, EntitySyncStatus.REALLY_OLD_DATE, uuid, entityTypeUuid);
                db.create(EntitySyncStatus.schema.name, updatedEntity, true);
            })
        });
    }

    _deleteIndividualAndDependentForDirectlyAssignableSubjectTypes() {
        const db = this.db;
        const allDirectlyAssignableSubjectTypes = this.getService(SubjectTypeService).getAllDirectlyAssignable();
        _.forEach(allDirectlyAssignableSubjectTypes, subjectType => {
            this.deleteTxDataForSubjectType(subjectType);
            this.resetSyncForSubjectType(subjectType, db);
        });
    }

    _restoreSettings(prevSettings) {
        this.getService(SettingsService).saveOrUpdate(prevSettings);
    }

    _restoreUserInfo(prevUserInfo) {
        this.getService(UserInfoService).saveOrUpdate(prevUserInfo);
    }

    resetSyncForSubjectType(subjectType, db) {
        const formMappingsForSubjectType = this.getService(FormMappingService).getFormMappingsForSubjectType(subjectType).map(_.identity);
        _.forEach(formMappingsForSubjectType, (formMapping) => {
            const {entityName, entityTypeUuid} = formMapping.getEntityNameAndEntityTypeUUID();
            this.resetSync(entityName, entityTypeUuid, db);
        })
    }

    resetSync(entityName, entityTypeUUID, db) {
        this.db.write(() => {
            db.objects(EntitySyncStatus.schema.name)
                .filtered(`entityName = $0 and entityTypeUuid = $1`, entityName, entityTypeUUID)
                .map(u => _.assign({}, u))
                .forEach(({uuid, entityName, entityTypeUuid}) => {
                    const updatedEntity = EntitySyncStatus.create(entityName, EntitySyncStatus.REALLY_OLD_DATE, uuid, entityTypeUuid);
                    db.create(EntitySyncStatus.schema.name, updatedEntity, true);
                })
        });
    }

    deleteTxDataForSubjectType(subjectType) {
        this.getService(IndividualService)
            .getAllBySubjectType(subjectType)
            .map(_.identity)
            .forEach(individual => {
                const subjectUUID = _.get(individual, 'uuid');
                if (!_.isEmpty(subjectUUID)) {
                    this.getService(SubjectMigrationService).removeEntitiesFor({subjectUUID})
                }
            })
    }

    async _prepareBackupFiles(realmDestFile, fileLoggerService) {
        const filesToZip = [realmDestFile];
        try {
            const logFilePath = await fileLoggerService.getLogFilePath();
            const logExists = await fs.exists(logFilePath);
            if (logExists) {
                await fs.copyFile(logFilePath, BACKUP_LOG_FILE);
                filesToZip.push(BACKUP_LOG_FILE);
                General.logDebug("BackupRestoreRealmService", `Including log file in backup: ${BACKUP_LOG_FILE}`);
            }
        } catch (error) {
            General.logWarn("BackupRestoreRealmService", `Could not include log file in backup: ${error.message}`);
        }
        return filesToZip;
    }

    async _prepareLogsOnlyBackup(fileLoggerService) {
        const filesToZip = [];
        try {
            const logFilePath = await fileLoggerService.getLogFilePath();
            const logExists = await fs.exists(logFilePath);
            if (logExists) {
                await fs.copyFile(logFilePath, BACKUP_LOG_FILE);
                filesToZip.push(BACKUP_LOG_FILE);
                General.logDebug("BackupRestoreRealmService", `Including log file in logs-only backup: ${BACKUP_LOG_FILE}`);
            } else {
                General.logWarn("BackupRestoreRealmService", "No log file available for logs-only backup");
            }
        } catch (error) {
            General.logWarn("BackupRestoreRealmService", `Could not include log file in logs-only backup: ${error.message}`);
        }
        
        if (filesToZip.length === 0) {
            throw new Error("No files available for logs-only backup");
        }
        return filesToZip;
    }

    async _cleanupBackupFiles(realmDestFile) {
        await removeBackupFile(realmDestFile);
        await removeBackupFile(BACKUP_LOG_FILE).catch(() => {});
    }

}

export const removeBackupFile = async (backupFilePath) => {
    await fs.exists(backupFilePath)
        .then((exists) => exists && fs.unlink(backupFilePath))
        .catch((error) => {
            General.logError(`Error while removing backup file, ${error.message}`);
            throw error;
        });
};
