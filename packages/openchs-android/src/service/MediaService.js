import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import RNFetchBlob from "rn-fetch-blob";
import General from "../utility/General";
import {get} from "../framework/http/requests";
import FileSystem from "../model/FileSystem";
import fs from 'react-native-fs';

@Service("mediaService")
class MediaService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
    }

    downloadMedia(remoteFilePath, targetFilePath) {
        const settingsService = this.getService(SettingsService);
        const serverUrl = settingsService.getSettings().serverURL;
        return get(`${serverUrl}/media/signedUrl?url=${remoteFilePath}`)
            .then(downloadUrl => this.downloadFromUrl(downloadUrl, targetFilePath));
    }

    downloadFromUrl(url, targetFilePath, cb) {
        return RNFetchBlob
            .config({fileCache: true, path: targetFilePath,})
            .fetch('GET', url, {})
            .progress((received, total) => {
                if (cb) cb(received, total);
            })
            .then((res) => {
                General.logDebug("MediaService", `The file saved to :${res.path()}`);
                return res;
            });
    }

    getAbsolutePath(uri, type) {
        const typeToDirectoryMap = new Map([
            ['Video', FileSystem.getVideosDir],
            ['Image', FileSystem.getImagesDir],
            ['Audio', FileSystem.getAudioDir],
            ['News', FileSystem.getNewsDir],
            ['File', FileSystem.getFileDir],
            ['Icons', FileSystem.getIconsDir],
            ['Profile-Pics', FileSystem.getProfilePicsDir]
            ]);
        if (!uri) return '';
        const fileName = this.getFileName(uri);
        return `${typeToDirectoryMap.get(type)()}/${fileName}`.trim();
    }

    getFileName(uri) {
        return _.get(uri.trim().match(/[0-9A-Fa-f-]{36}\.\w+$/), 0);
    }

    exists(filePath) {
        if(_.isNil(filePath)) {
            return Promise.resolve(false);
        }
        return fs.exists(filePath);
    }

    async downloadFileIfRequired(s3Key, type) {
        const filePathInDevice = this.getAbsolutePath(s3Key, type);
        const exists = await this.exists(filePathInDevice);
        if (!exists) {
            return this.downloadMedia(s3Key, filePathInDevice)
                .catch((error) => {
                    General.logDebug('ImageDownloadService', `Error while downloading image with s3 key ${s3Key}`);
                    General.logDebug('ImageDownloadService', error);
                })
        }
        return filePathInDevice;
    }
}

export default MediaService;
