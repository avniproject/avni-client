import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import AuthService from "./AuthService";
import RNFetchBlob from "rn-fetch-blob";
import General from "../utility/General";
import {get} from "../framework/http/requests";
import FileSystem from "../model/FileSystem";
import fs from 'react-native-fs';

@Service("authService")
class MediaService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
        this.authService = this.getService(AuthService);
    }

    downloadMedia(remoteFilePath, targetFilePath) {
        const authService = this.getService(AuthService);
        const settingsService = this.getService(SettingsService);
        const serverUrl = settingsService.getSettings().serverURL;
        return authService.getAuthToken()
            .then(auth => get(`${serverUrl}/media/signedUrl?url=${remoteFilePath}`, auth))
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
            ['News', FileSystem.getNewsDir],
            ]);
        if (!uri) return '';
        const fileName = _.get(uri.trim().match(/[0-9A-Fa-f-]{36}\.\w+$/), 0);
        return `${typeToDirectoryMap.get(type)()}/${fileName}`.trim();
    }

    exists(filePath) {
        if(_.isNil(filePath)) {
            return Promise.resolve(false);
        }
        return fs.exists(filePath);
    }
}

export default MediaService;
