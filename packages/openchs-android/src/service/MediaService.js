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
