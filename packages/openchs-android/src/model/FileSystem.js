import fs from 'react-native-fs';
import General from "../utility/General";
import { PermissionsAndroid } from 'react-native';

export default class FileSystem {

    static async init() {
        General.logDebug("FileSystem", "Creating directories if they don't exist");
        General.logDebug("FileSystem", FileSystem.getImagesDir());
        General.logDebug("FileSystem", FileSystem.getVideosDir());

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
                        .then(() => FileSystem.mkdir(FileSystem.getBackupDir(), 'db'))
                        .then(() => FileSystem.mkdir(FileSystem.getNewsDir(), 'news'))
                        .catch(err => General.logError("FileSystem", err));
                } else {
                    General.logError("FileSystem", "No permissions to write to external storage")
                }
            } catch (err) {
                General.logError(err);
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

    static getNewsDir() {
        General.logDebug("FileSystem", `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/news/`);
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/news`;
    }

    static getBackupDir(){
        General.logDebug("FileSystem", `${fs.ExternalStorageDirectoryPath}/OpenCHS/db/`);
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/db/`;
    }
}
