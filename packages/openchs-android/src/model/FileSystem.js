import fs from 'react-native-fs';
import General from "../utility/General";

export default class FileSystem {
    static init() {
        General.logInfo("FileSystem", "Creating directories if they don't exist");
        fs.mkdir(FileSystem.getImagesDir());
    }

    static getImagesDir() {
        return `${fs.ExternalStorageDirectoryPath}/OpenCHS/media/images/`;
    }
}
