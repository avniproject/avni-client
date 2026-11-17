import BaseService from "./BaseService";
import {CustomCardConfig} from 'avni-models';
import Service from "../framework/bean/Service";
import FileSystem from "../model/FileSystem";
import General from "../utility/General";
import SettingsService from "./SettingsService";
import AuthService from "./AuthService";
import MessageService from "./MessageService";
import RNFetchBlob from "react-native-blob-util";
import fs from 'react-native-fs';
import {IDP_PROVIDERS} from "../model/IdpProviders";
import RuleEvaluationService from "./RuleEvaluationService";
import _ from "lodash";

// Outside the reducer, as both hold strings that must not be logged with the state.
// config uuid → {promise} | {template} | {error}
const templates = new Map();
// dashboard uuid → {html, filterKey, calculatedAt}, the last page calculated this session
export const lastFullPages = new Map();
const templateChangeListeners = new Set();

export function clearCaches() {
    templates.clear();
    lastFullPages.clear();
}

// Every kept page built from this config, on screen or not, is recalculated on its next show.
export function markPagesStale(configUUID) {
    lastFullPages.forEach((last, dashboardUUID) => {
        if (last.configUUID === configUUID) lastFullPages.set(dashboardUUID, {...last, stale: true});
    });
}

export function subscribeTemplateChange(listener) {
    templateChangeListeners.add(listener);
    return () => templateChangeListeners.delete(listener);
}

@Service("customCardConfigService")
class CustomCardConfigService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return CustomCardConfig.schema.name;
    }

    downloadHtmlFiles() {
        const configs = this.getAllNonVoided();
        const settingsService = this.getService(SettingsService);
        const serverUrl = settingsService.getSettings().serverURL;
        const targetDir = FileSystem.getCustomCardConfigsDir();

        configs.forEach((config) => {
            if (!config.htmlFileS3Key) return;
            const sourceUrl = `${serverUrl}/customCardConfigFile/${config.htmlFileS3Key}`;
            const targetFilePath = `${targetDir}/${config.htmlFileS3Key}`;
            General.logDebug("CustomCardConfigService", `Downloading ${sourceUrl} to ${targetFilePath}`);
            this.downloadFromUrl(sourceUrl, targetFilePath)
                .then(() => fs.readFile(targetFilePath, "utf8"))
                .then((content) => {
                    const shown = templates.get(config.uuid);
                    // Every full sync downloads every file again, so an unchanged file keeps its cached page and does not recalculate it.
                    if (shown && shown.template === content) return;
                    templates.delete(config.uuid);
                    markPagesStale(config.uuid);
                    const stale = shown && (shown.error || !_.isNil(shown.template));
                    if (stale) templateChangeListeners.forEach((listener) => listener(config.uuid));
                }, (error) => {
                    templates.delete(config.uuid);
                    General.logError("CustomCardConfigService", `Downloading ${sourceUrl} failed: ${error && error.message}`);
                });
        });
    }

    async downloadFromUrl(url, targetFilePath) {
        const [token, idpType] = await Promise.all([
            this.getService(AuthService).getAuthProviderService().getAuthToken(),
            this.getService(SettingsService).getSettings().idpType
        ]);
        const headers = idpType === IDP_PROVIDERS.NONE ? {'USER-NAME': token} : {'AUTH-TOKEN': token};
        // Into a temp file first: an error body written into the live path would stop any refetch.
        // Its own name, as a read on first open and a sync can download the same file at once.
        const tempFilePath = `${targetFilePath}.${General.randomUUID()}.tmp`;
        try {
            const response = await RNFetchBlob.config({fileCache: true, path: tempFilePath}).fetch('GET', url, headers);
            const status = _.get(response.info(), 'status');
            if (!(status >= 200 && status < 300)) throw new Error(`Downloading ${url} gave status ${status}`);
            await fs.moveFile(tempFilePath, targetFilePath);
        } catch (e) {
            await fs.unlink(tempFilePath).catch(_.noop);
            throw e;
        }
    }

    async readHtmlTemplate(config) {
        if (!config.htmlFileS3Key) return "";
        const targetPath = `${FileSystem.getCustomCardConfigsDir()}/${config.htmlFileS3Key}`;
        const exists = await fs.exists(targetPath);
        if (!exists) {
            const settingsService = this.getService(SettingsService);
            const sourceUrl = `${settingsService.getSettings().serverURL}/customCardConfigFile/${config.htmlFileS3Key}`;
            General.logDebug("CustomCardConfigService", `Template missing, fetching ${sourceUrl}`);
            await this.downloadFromUrl(sourceUrl, targetPath);
        }
        return fs.readFile(targetPath, "utf8");
    }

    loadTemplate(config) {
        const entry = templates.get(config.uuid);
        if (entry && !_.isNil(entry.template)) return Promise.resolve(entry.template);
        if (entry && entry.promise) return entry.promise;
        const own = {};
        own.promise = this.readHtmlTemplate(config).then((template) => {
            if (templates.get(config.uuid) === own) templates.set(config.uuid, {template});
            return template;
        }, (error) => {
            if (templates.get(config.uuid) === own) templates.set(config.uuid, {error});
            throw error;
        });
        templates.set(config.uuid, own);
        return own.promise;
    }

    getCachedTemplate(config) {
        return templates.get(config.uuid);
    }

    renderPage(config, ruleInputArray, template) {
        try {
            const ruleResult = this.getService(RuleEvaluationService).executeCustomCardDataRule(config, ruleInputArray) || {};
            if (ruleResult.hasErrorMsg) return {error: ruleResult.errorMsg || 'Data rule failed'};
            // `data` wins over `deferredDataFunction` when both are present.
            const eagerData = ruleResult.data;
            const data = (eagerData != null && typeof eagerData === 'object')
                ? eagerData
                : (_.isFunction(ruleResult.deferredDataFunction) ? ruleResult.deferredDataFunction() : {});
            const translations = this.resolveTranslations(config);
            return {html: new Function('data', 'translations', `return \`${template}\``)(data, translations)};
        } catch (e) {
            General.logError('CustomCardConfigService', e);
            return {error: e.message || String(e)};
        }
    }

    resolveTranslations(config) {
        const defaults = config && typeof config.getTranslations === 'function'
            ? config.getTranslations()
            : {};
        const i18n = this.getService(MessageService).getI18n();
        // Resolve per access so the template can reference any org translation key, not just keys declared on the card.
        // Precedence: org translation (any locale) → card English default → key.
        return new Proxy({}, {
            get(_target, key) {
                if (typeof key !== 'string') return undefined;
                const translated = i18n.t(key);
                if (translated !== key) return translated;
                if (defaults[key] != null) return defaults[key];
                return key;
            }
        });
    }
}

export default CustomCardConfigService;
