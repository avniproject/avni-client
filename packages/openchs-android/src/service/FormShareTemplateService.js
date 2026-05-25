import BaseService from "./BaseService";
import {Form} from "avni-models";
import Service from "../framework/bean/Service";
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import SettingsService from "./SettingsService";
import AuthService from "./AuthService";
import RNFetchBlob from "react-native-blob-util";
import fs from "react-native-fs";
import {IDP_PROVIDERS} from "../model/IdpProviders";

@Service("formShareTemplateService")
class FormShareTemplateService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Form.schema.name;
    }

    async downloadHtmlFiles() {
        try {
            // Form schema has no `voided` column, so we cannot use getAllNonVoided here.
            const forms = this.db.objects(Form.schema.name);
            const settingsService = this.getService(SettingsService);
            const serverUrl = settingsService.getSettings().serverURL;
            const targetDir = FileSystem.getFormShareTemplatesDir();

            const downloads = [];
            forms.forEach((form) => {
                if (!form.shareTemplateS3Key) return;
                const sourceUrl = `${serverUrl}/formShareTemplateFile/${form.shareTemplateS3Key}`;
                const targetFilePath = `${targetDir}/${form.shareTemplateS3Key}`;
                General.logDebug("FormShareTemplateService", `Downloading ${sourceUrl} to ${targetFilePath}`);
                downloads.push(this.downloadFromUrl(sourceUrl, targetFilePath));
            });
            await Promise.all(downloads);
        } catch (e) {
            General.logError("FormShareTemplateService.downloadHtmlFiles", e);
        }
    }

    async downloadFromUrl(url, targetFilePath) {
        const token = await this.getService(AuthService).getAuthProviderService().getAuthToken();
        const idpType = this.getService(SettingsService).getSettings().idpType;
        const headers = idpType === IDP_PROVIDERS.NONE ? {"USER-NAME": token} : {"AUTH-TOKEN": token};
        return RNFetchBlob
            .config({fileCache: true, path: targetFilePath})
            .fetch("GET", url, headers);
    }

    async readHtmlTemplate(form) {
        if (!form || !form.shareTemplateS3Key) return "";
        const targetPath = `${FileSystem.getFormShareTemplatesDir()}/${form.shareTemplateS3Key}`;
        const exists = await fs.exists(targetPath);
        if (!exists) {
            const settingsService = this.getService(SettingsService);
            const sourceUrl = `${settingsService.getSettings().serverURL}/formShareTemplateFile/${form.shareTemplateS3Key}`;
            General.logDebug("FormShareTemplateService", `Template missing, fetching ${sourceUrl}`);
            await this.downloadFromUrl(sourceUrl, targetPath);
        }
        return fs.readFile(targetPath, "utf8");
    }
}

export default FormShareTemplateService;
