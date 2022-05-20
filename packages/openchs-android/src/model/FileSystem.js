import fs from 'react-native-fs';
import General from "../utility/General";
import {PermissionsAndroid} from 'react-native';

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
                        .then(() => FileSystem.mkdir(FileSystem.getProfilePicsDir(), 'profile-pics'))
                       .then(() => {
                           const olderBasePath = `${fs.ExternalStorageDirectoryPath}/OpenCHS`;
                           const newBasePath = `${fs.ExternalDirectoryPath}/Avni`;
                           FileSystem.migrateOldData(olderBasePath, newBasePath);
                       })
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
        General.logDebug("FileSystem", `${fs.ExternalDirectoryPath}/Avni/media/images/`);
        return `${fs.ExternalDirectoryPath}/Avni/media/images`;
    }

    static getVideosDir() {
        General.logDebug("FileSystem", `${fs.ExternalDirectoryPath}/Avni/media/videos/`);
        return `${fs.ExternalDirectoryPath}/Avni/media/videos`;
    }

    static getAudioDir() {
        General.logDebug("FileSystem", `${fs.ExternalDirectoryPath}/Avni/media/audios/`);
        return `${fs.ExternalDirectoryPath}/Avni/media/audios`;
    }

    static getNewsDir() {
        General.logDebug("FileSystem", `${fs.ExternalDirectoryPath}/Avni/media/news/`);
        return `${fs.ExternalDirectoryPath}/Avni/media/news`;
    }

    static getBackupDir(){
        return `${fs.ExternalDirectoryPath}/Avni/db/`;
    }

    static getExtensionsDir(){
        return `${fs.ExternalDirectoryPath}/Avni/extensions`;
    }

    static getIconsDir() {
        return `${fs.ExternalDirectoryPath}/Avni/icons`;
    }

    static getProfilePicsDir() {
        return `${fs.ExternalDirectoryPath}/Avni/profile-pics`;
    }

    static getFileDir() {
        return `${fs.ExternalDirectoryPath}/Avni/media/files`;
    }

    static async migrateOldData(source, destination) {
        General.logDebug("FileSystem", `Copying from ${source} -> ${destination}`);
        try {
            const olderItems = await fs.readDir(source);
            await olderItems.forEach(async (item) => {
                if (item.isFile()) {
                    const destPath = `${destination}/${item.name}`;
                    const fileExists = await fs.exists(destPath);
                    if (!fileExists) {
                        await fs.copyFile(item.path, destPath);
                        await fs.unlink(item.path);
                    }
                } else {
                    const subDirectory = source + "/" + item.name;
                    const subDestination = destination + "/" + item.name;
                    await FileSystem.mkdir(subDestination, subDestination);
                    await this.migrateOldData(subDirectory, subDestination);
                }
            });
        } catch (e) {
            General.logDebug("FileSystem", "Got error while migrating older files");
            General.logError("FileSystem", e);
        }
    }
}
