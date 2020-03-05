import {Schema} from 'avni-models';
import Realm from 'realm';
import FileSystem from "./model/FileSystem";
import {ToastAndroid} from 'react-native';
import General from "./utility/General";
import fs from 'react-native-fs';

const REALM_FILE_NAME = "default.realm";
const DESTINATION_FILE_PATH = `${fs.DocumentDirectoryPath}/${REALM_FILE_NAME}`;

export const backup = (fileName) => {
    const db = new Realm(Schema);
    fs.readDir(FileSystem.getBackupDir())
        .then((files) => files.forEach(file => fs.unlink(file.path)))
        .then(() => db.writeCopyTo(`${FileSystem.getBackupDir()}/${fileName}`))
        .then(() => ToastAndroid.show('Backup Complete', ToastAndroid.SHORT))
        .catch((error) => {
            General.logError(`Error while taking backup, ${error.message}`);
            throw error;
        });
};

export const restore = async (backupFilePath) => {
    await fs.exists(DESTINATION_FILE_PATH)
        .then((exists) => exists && fs.unlink(DESTINATION_FILE_PATH))
        .then(() => fs.copyFile(backupFilePath, DESTINATION_FILE_PATH))
        .then(() => fs.unlink(backupFilePath))
        .then(() => ToastAndroid.show('Backup Restored', ToastAndroid.SHORT))
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

