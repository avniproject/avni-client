import fs from 'react-native-fs';
import General from "../utility/General";
import { PermissionsAndroid } from 'react-native';

export default class FileSystem {

    static async init() {
        General.logDebug("FileSystem", "Creating directories if they don't exist");
        General.logDebug("FileSystem", FileSystem.getImagesDir());
        General.logDebug("FileSystem", FileSystem.getVideosDir());
        General.logDebug("FileSystem", FileSystem.getAudioDir());
        General.logDebug("FileSystem", FileSystem.getExtensionsDir());
        General.logDebug("FileSystem", FileSystem.getFileDir());

        const grantSuccess = (grant) => {
            return typeof (grant) === 'boolean'? grant: PermissionsAndroid.RESULTS.GRANTED === grant;
        };

       await (async function requestFileSystemPermission() {
            try {
                const grant = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                        'title': 'Write to external storage',
                        'message': 'This is required to store files for Avni'
                    }
                );
                if (grantSuccess(grant)) {
                   await FileSystem.mkdir(FileSystem.getImagesDir(), 'images')
                        .then(() => FileSystem.mkdir(FileSystem.getVideosDir(), 'videos'))
                        .then(() => FileSystem.mkdir(FileSystem.getAudioDir(), 'audios'))
                        .then(() => FileSystem.mkdir(FileSystem.getBackupDir(), 'db'))
                        .then(() => FileSystem.mkdir(FileSystem.getNewsDir(), 'news'))
                        .then(() => FileSystem.mkdir(FileSystem.getExtensionsDir(), 'extensions'))
                        .then(() => FileSystem.mkdir(FileSystem.getFileDir(), 'file'))
                        .then(() => FileSystem.mkdir(FileSystem.getIconsDir(), 'icons'))
                        .catch(err => General.logError("FileSystem", err));
                } else {
                    General.logError("FileSystem", "No permissions to write to external storage")
                }
            } catch (err) {
                General.logError("FileSystem", err);
            }
        })();
    }

    static mkdir(path, hint) {
        return fs.mkdir(path).catch(err => {
            General.logError("FileSystem", `Could not create ${hint} directory`);
            throw err;
        });
    }

    static getImagesDir() {
        General.logDebug("FileSystem", `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/images/`);
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/images`;
    }

    static getVideosDir() {
        General.logDebug("FileSystem", `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/videos/`);
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/videos`;
    }

    static getAudioDir() {
        General.logDebug("FileSystem", `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/audios/`);
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/audios`;
    }

    static getNewsDir() {
        General.logDebug("FileSystem", `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/news/`);
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/news`;
    }

    static getBackupDir(){
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/db/`;
    }

    static getExtensionsDir(){
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/extensions`;
    }

    static getIconsDir() {
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/icons`;
    }

    static getFileDir() {
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/files`;
    }
}
