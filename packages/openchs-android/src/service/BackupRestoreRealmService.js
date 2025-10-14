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

const REALM_FILE_NAME = "default.realm";
const REALM_FILE_FULL_PATH = `${fs.DocumentDirectoryPath}/${REALM_FILE_NAME}`;

@Service("backupRestoreRealmService")
export default class BackupRestoreRealmService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    subscribeOnRestore(dumpFileRestoreCompleted) {
        this.dumpFileRestoreCompleted = dumpFileRestoreCompleted;
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

    backup(dumpType, cb) {
        const fileName = dumpType === MediaQueueService.DumpType.Adhoc ? `adhoc-${General.randomUUID()}.realm` : `${General.randomUUID()}.realm`;

        let destFile = `${FileSystem.getBackupDir()}/${fileName}`;
        let destZipFile = `${FileSystem.getBackupDir()}/${fileName}.zip`;
        let mediaQueueService = this.getService(MediaQueueService);
        General.logInfo("BackupRestoreRealmService", `Dest: ${destFile}`);
        this.db.writeCopyTo({path: destFile});
        zip(destFile, destZipFile)
            .then(() => {
                General.logDebug("BackupRestoreRealmService", "Getting upload location");
                cb(10, "backupUploading");
            })
            .then(() => mediaQueueService.getDumpUploadUrl(dumpType, `adhoc-dump-as-zip-${_.get(this.getService(UserInfoService).getUserInfo(), 'username')}-${General.randomUUID()}`))
            .then((url) => mediaQueueService.foregroundUpload(url, destZipFile, (written, total) => {
                General.logDebug("BackupRestoreRealmService", `Upload in progress ${written}/${total}`);
                cb(10 + (97 - 10) * (written / total), "backupUploading");
            }))
            .then(() => {
                General.logDebug("BackupRestoreRealmService", "Removing database backup file created");
                cb(97, "backupUploading");
            })
            .then(() => removeBackupFile(destFile))
            .then(() => {
                General.logDebug("BackupRestoreRealmService", "Removing database backup compressed file created");
                cb(99, "backupUploading");
            })
            .then(() => removeBackupFile(destZipFile))
            .then(() => cb(100, "backupCompleted"))
            .catch((error) => {
                General.logError("BackupRestoreRealmService", error);
                throw error;
            });
    }

    restore(cb) {
        let settingsService = this.getService(SettingsService);
        let mediaService = this.getService(MediaService);
        let entitySyncStatusService = this.getService(EntitySyncStatusService);
        let downloadedFile = `${fs.DocumentDirectoryPath}/${General.randomUUID()}.zip`;
        let downloadedUncompressedDir = `${fs.DocumentDirectoryPath}/${General.randomUUID()}`;
        const prevSettings = this.getPreviousSettings(settingsService);
        const prevUserInfo = UserInfo.fromResource({username: prevSettings.userId, organisationName: 'dummy', name: prevSettings.userId});

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
                            General.logDebug("BackupRestoreRealmService", "Deleting local database");
                            cb(89, "restoringDb");
                        })
                        .then(() => fs.exists(REALM_FILE_FULL_PATH))
                        .then((exists) => exists && fs.unlink(REALM_FILE_FULL_PATH))
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
                        .then(() => removeBackupFile(downloadedFile))
                        .then(() => removeBackupFile(downloadedUncompressedDir))
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
                        .catch((error) => {
                            General.logErrorAsInfo("BackupRestoreRealmService", error);
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

}

export const removeBackupFile = async (backupFilePath) => {
    await fs.exists(backupFilePath)
        .then((exists) => exists && fs.unlink(backupFilePath))
        .catch((error) => {
            General.logError(`Error while removing backup file, ${error.message}`);
            throw error;
        });
};
