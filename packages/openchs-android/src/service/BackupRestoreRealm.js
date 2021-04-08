import {EntitySyncStatus, IdentifierAssignment, UserInfo} from 'avni-models';
import FileSystem from "../model/FileSystem";
import {ToastAndroid} from 'react-native';
import General from "../utility/General";
import fs from 'react-native-fs';
import {zip} from 'react-native-zip-archive';
import Service from "../framework/bean/Service";
import BaseService from "../service/BaseService";
import MediaQueueService from "../service/MediaQueueService";
import {get} from '../framework/http/requests';
import SettingsService from "../service/SettingsService";
import AuthService from "../service/AuthService";

const REALM_FILE_NAME = "default.realm";
const DESTINATION_FILE_PATH = `${fs.DocumentDirectoryPath}/${REALM_FILE_NAME}`;

@Service("backupAndRestoreService")
export default class BackupRestoreRealmService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    backup(localFileName, cb) {
        let destFile = `${FileSystem.getBackupDir()}/${localFileName}`;
        let destZipFile = `${FileSystem.getBackupDir()}/${localFileName}.zip`;
        let mediaQueueService = this.getService(MediaQueueService);
        let settingsService = this.getService(SettingsService);
        let authService = this.getService(AuthService);
        General.logInfo("BackupRestoreRealmService", `Dest: ${destFile}`);
        fs.readDir(FileSystem.getBackupDir())
            .then((files) => files.forEach(file => fs.unlink(file.path)))
            .then(() => cb(1, "Creating copy of database"))
            .then(() => this.db.writeCopyTo(destFile))
            .then(() => cb(5, "Compressing the copied database file"))
            .then(() => zip(destFile, destZipFile))
            .then(() => cb(10, "Securely getting upload location for backup"))
            .then(() => authService.getAuthToken())
            .then((authToken) => get(`${settingsService.getSettings().serverURL}/media/mobileDatabaseBackupUrl/upload`, authToken))
            .then((url) => mediaQueueService.foregroundUpload(url, destZipFile, (written, total) => {
                cb(10 + (97 - 10) * (written / total), "Uploading database backup to the secure location")
            }))
            .then(() => cb(97, "Removing database backup file created"))
            .then(() => removeBackupFile(destFile))
            .then(() => cb(99, "Removing database backup compressed file created"))
            .then(() => removeBackupFile(destZipFile))
            .then(() => cb(100, "Backup completed"))
            .catch((error) => {
                General.logError("BackupRestoreRealm", error);
                throw error;
            });
    };
}

const deleteUserInfoAndIdAssignment = (db, entitySyncStatus) => {
    db.write(() => {
        const objects = db.objects(UserInfo.schema.name);
        const assignmentObjects = db.objects(IdentifierAssignment.schema.name);
        db.delete(objects);
        db.delete(assignmentObjects);
        entitySyncStatus.forEach(({uuid, entityName, entityTypeUuid}) => {
            const updatedEntity = EntitySyncStatus.create(entityName, EntitySyncStatus.REALLY_OLD_DATE, uuid, entityTypeUuid);
            db.create(EntitySyncStatus.schema.name, updatedEntity, true);
        })
    });
};

const restoreDeletedOrUpdatedEntities = (db, userInfo, entitySyncStatus, identifierAssignment) => {
    db.write(() => {
        _.forEach(userInfo, ui => db.create(UserInfo.schema.name, ui, true));
        _.forEach(entitySyncStatus, ({uuid, entityName, loadedSince, entityTypeUuid}) => {
            const updatedEntity = EntitySyncStatus.create(entityName, loadedSince, uuid, entityTypeUuid);
            db.create(EntitySyncStatus.schema.name, updatedEntity, true)
        });
        _.forEach(identifierAssignment, ida => db.create(IdentifierAssignment.schema.name, ida, true));
    });
};

export const restore = async (backupFilePath, onRestoreComplete) => {
    await fs.exists(DESTINATION_FILE_PATH)
        .then((exists) => exists && fs.unlink(DESTINATION_FILE_PATH))
        .then(() => fs.copyFile(backupFilePath, DESTINATION_FILE_PATH))
        .then(() => fs.unlink(backupFilePath))
        .then(() => ToastAndroid.show('Backup Restored', ToastAndroid.SHORT))
        .then(() => onRestoreComplete())
        .catch((error) => {
            General.logError(`Error while restoring file, ${error.message}`);
            throw error;
        });
};

export const removeBackupFile = async (backupFilePath) => {
    await fs.exists(backupFilePath)
        .then((exists) => exists && fs.unlink(backupFilePath))
        .catch((error) => {
            General.logError(`Error while removing backup file, ${error.message}`);
            throw error;
        });
};