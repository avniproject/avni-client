import {EntitySyncStatus, IdentifierAssignment, UserInfo} from 'avni-models';
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import fs from 'react-native-fs';
import {unzip, zip} from 'react-native-zip-archive';
import Service from "../framework/bean/Service";
import BaseService from "../service/BaseService";
import MediaQueueService from "../service/MediaQueueService";
import {get} from '../framework/http/requests';
import SettingsService from "../service/SettingsService";
import AuthService from "../service/AuthService";
import MediaService from "./MediaService";
import _ from 'lodash';

const REALM_FILE_NAME = "default.realm";
const REALM_FILE_FULL_PATH = `${fs.DocumentDirectoryPath}/${REALM_FILE_NAME}`;

@Service("backupAndRestoreService")
export default class BackupRestoreRealmService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    backup(dumpType, cb) {
        const fileName = dumpType === MediaQueueService.DumpType.Adhoc ? `adhoc-${General.randomUUID()}.realm` : `${General.randomUUID()}.realm`;

        let destFile = `${FileSystem.getBackupDir()}/${fileName}`;
        let destZipFile = `${FileSystem.getBackupDir()}/${fileName}.zip`;
        let mediaQueueService = this.getService(MediaQueueService);
        let settingsService = this.getService(SettingsService);
        let authService = this.getService(AuthService);
        General.logInfo("BackupRestoreRealmService", `Dest: ${destFile}`);
        this.db.writeCopyTo(destFile);
        zip(destFile, destZipFile)
            .then(() => cb(10, "backupGettingUploadLocation"))
            .then(() => authService.getAuthToken())
            .then((authToken) => mediaQueueService.getDumpUploadUrl(dumpType, authToken, `adhoc-dump-as-zip-${General.randomUUID()}`))
            .then((url) => mediaQueueService.foregroundUpload(url, destZipFile, (written, total) => {
                cb(10 + (97 - 10) * (written / total), "backupUploading")
            }))
            .then(() => cb(97, "backupRemoveFile"))
            .then(() => removeBackupFile(destFile))
            .then(() => cb(99, "backupRemoveZipFile"))
            .then(() => removeBackupFile(destZipFile))
            .then(() => cb(100, "backupCompleted"))
            .catch((error) => {
                General.logError("BackupRestoreRealmService", error);
                throw error;
            });
    }

    restore(cb) {
        let authService = this.getService(AuthService);
        let settingsService = this.getService(SettingsService);
        let mediaService = this.getService(MediaService);
        let downloadedFile = `${fs.DocumentDirectoryPath}/${General.randomUUID()}.zip`;
        let downloadedUncompressedDir = `${fs.DocumentDirectoryPath}/${General.randomUUID()}`;

        General.logInfo("BackupRestoreRealm", `Downloaded file: ${downloadedFile}, Unzipped directory: ${downloadedUncompressedDir}, Realm file: ${REALM_FILE_FULL_PATH}`);

        return authService.getAuthToken()
            .then(cb(1, "Finding pre-existing database"))
            .then((authToken) => get(`${settingsService.getSettings().serverURL}/media/mobileDatabaseBackupUrl/download`, authToken))
            .then((url) => mediaService.downloadFromUrl(url, downloadedFile, (received, total) => {
                cb(1 + (received * 85) / total, "Downloading prepared database")
            }))
            .then(() => cb(87, "Decompressing downloaded database dump"))
            .then(() => unzip(downloadedFile, downloadedUncompressedDir))
            .then(() => cb(89, "Deleting local database"))
            .then(() => fs.exists(REALM_FILE_FULL_PATH))
            .then((exists) => exists && fs.unlink(REALM_FILE_FULL_PATH))
            .then(() => cb(90, "Create database from downloaded file"))
            .then(() => fs.readDir(downloadedUncompressedDir))
            .then((files) => _.find(files, (file) => file.name.endsWith("realm")).path)
            .then((fullFilePath) => {
                General.logInfo("BackupRestoreRealm", `Replacing realm file with: ${fullFilePath}`);
                return fs.copyFile(fullFilePath, REALM_FILE_FULL_PATH);
            })
            .then(() => cb(92, "Removing downloaded files"))
            .then(() => removeBackupFile(downloadedFile))
            .then(() => removeBackupFile(downloadedUncompressedDir))
            .then(() => cb(95, "Personalising database"))
            .then(() => this._deleteUserInfoAndIdAssignment())
            .then(() => cb(100, "Personalisation of database complete"))
            .catch((error) => {
                General.logError("BackupRestoreRealm", error);
                cb(100, "Restore complete");
            });
    }

    _deleteUserInfoAndIdAssignment() {
        const db = this.db;

        const entitySyncStatus = db.objects(EntitySyncStatus.schema.name)
            .filtered(`entityName = 'IdentifierAssignment'`)
            .map(u => _.assign({}, u));

        this.db.write(() => {
            const objects = db.objects(UserInfo.schema.name);
            const assignmentObjects = db.objects(IdentifierAssignment.schema.name);
            db.delete(objects);
            db.delete(assignmentObjects);
            entitySyncStatus.forEach(({uuid, entityName, entityTypeUuid}) => {
                const updatedEntity = EntitySyncStatus.create(entityName, EntitySyncStatus.REALLY_OLD_DATE, uuid, entityTypeUuid);
                db.create(EntitySyncStatus.schema.name, updatedEntity, true);
            })
        });
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