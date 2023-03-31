import BaseService from "./BaseService";
import OrganisationConfigService from "./OrganisationConfigService";
import {Extension} from 'avni-models';
import SettingsService from "./SettingsService";
import MediaService from "./MediaService";
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import Service from "../framework/bean/Service";
import RNFetchBlob from "rn-fetch-blob";
import AuthService from "./AuthService";
import fs from 'react-native-fs';
import { IDP_PROVIDERS } from "../model/IdpProviders";


@Service("extensionService")
class ExtensionService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Extension.schema.name;
    }

    _getServerUrl() {
        return this.getService(SettingsService).getSettings().serverURL;
    }

    organisationConfigService() {
        return this.getService(OrganisationConfigService);
    }

    downloadExtensions() {
        if (!this.organisationConfigService().hasHomeScreen()) {
            return;
        }
        const extensionFiles = this.getAll();
        const mediaService = this.getService(MediaService);
        const filePathInDevice = FileSystem.getExtensionsDir();
        const settingsService = this.getService(SettingsService);
        const serverUrl = settingsService.getSettings().serverURL;

        extensionFiles.forEach((file) => {
            const sourceUrl = `${serverUrl}/extension/${file.url}`;
            const targetFilePath = `${filePathInDevice}/${file.url}`;
            General.logDebug("ExtensionService", `Downloading ${sourceUrl} to ${targetFilePath}`);
            this.downloadFromUrl(sourceUrl, targetFilePath);
        });
    }

    getHomeScreen() {
        if (!this.organisationConfigService().hasHomeScreen()) {
            return;
        }
        const homeScreenDetails = this.organisationConfigService().getHomeScreen();
        return fs.readFile(`${FileSystem.getExtensionsDir()}/${homeScreenDetails.fileName}`, "utf8");
    }

    async downloadFromUrl(url, targetFilePath, cb) {
        const [token, idpType] = await Promise.all([this.getService(AuthService).getAuthProviderService().getAuthToken(), this.getService(SettingsService).getSettings().idpType]);
        const headers = idpType === IDP_PROVIDERS.NONE ? {'USER-NAME': token} : {'AUTH-TOKEN': token};
        return RNFetchBlob
            .config({fileCache: true, path: targetFilePath,})
            .fetch('GET', url, headers)
            .progress((received, total) => {
                if (cb) cb(received, total);
            })
            .then((res) => {
                General.logDebug("MediaService", `The file saved to :${res.path()}`);
                return res;
            });
    }

    getUnreadNewsCount() {
        return this.getAllNonVoided().filtered('read = false').length;
    }

    isUnreadMoreThanZero() {
        return this.getUnreadNewsCount() > 0;
    }
}


export default ExtensionService;
