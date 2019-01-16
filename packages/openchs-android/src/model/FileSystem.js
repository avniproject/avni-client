import fs from 'react-native-fs';
import General from "../utility/General";
import { PermissionsAndroid } from 'react-native';

export default class FileSystem {

    static init() {
        General.logDebug("FileSystem", "Creating directories if they don't exist");
        General.logDebug("FileSystem", FileSystem.getImagesDir());

        (async function requestCameraPermission() {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                        'title': 'Write to external storage',
                        'message': 'This is required to store files for OpenCHS'
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    fs.mkdir(FileSystem.getImagesDir()).then(_.noop, (err) => {
                        General.logError("FileSystem", "Could not create images directory");
                        General.logError("FileSystem", err);
                    } );
                } else {
                    General.logError("FileSystem", "No permissions to write to external storage")
                }
            } catch (err) {
                General.logError(err);
            }
        })();
    }

    static getImagesDir() {
        General.logDebug("FileSystem", `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/images/`);
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/images/`;
    }
}
