import {Schema} from 'avni-models';
import Realm from 'realm';
import FileSystem from "./model/FileSystem";
import {ToastAndroid} from 'react-native';
import General from "./utility/General";
import fs from 'react-native-fs';

const EXPORT_REALM_PATH = FileSystem.getBackupDir();
const REALM_FILE_NAME = "default.realm";
export const BACKUP_FILE = `${EXPORT_REALM_PATH}/${REALM_FILE_NAME}`;
const DESTINATION_FILE = `${fs.DocumentDirectoryPath}/${REALM_FILE_NAME}`;

export const backup = () => {
    const db = new Realm(Schema);
    fs.exists(BACKUP_FILE)
        .then((exists) => exists && fs.unlink(BACKUP_FILE))
        .then(() => db.writeCopyTo(BACKUP_FILE))
        .then(() => ToastAndroid.show('Backup Complete', ToastAndroid.SHORT))
        .catch((error) => {
            General.logError(`Error while taking backup, ${error.message}`);
            throw error;
        });
};

export const restore = async () => {
    await fs.exists(DESTINATION_FILE)
        .then((exists) => exists && fs.unlink(DESTINATION_FILE))
        .then(() => fs.copyFile(BACKUP_FILE, DESTINATION_FILE))
        .then(() => fs.unlink(BACKUP_FILE))
        .then(() => ToastAndroid.show('Backup Restored', ToastAndroid.SHORT))
        .catch((error) => {
            General.logError(`Error while restoring file, ${error.message}`);
            throw error;
        });
};

export const removeBackupFile = async () => {
    await fs.exists(BACKUP_FILE)
        .then((exists) => exists && fs.unlink(BACKUP_FILE))
        .catch((error) => {
            General.logError(`Error while removing backup file, ${error.message}`);
            throw error;
        });
};

