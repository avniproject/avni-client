import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import { ConfigFile } from "openchs-models";
import BatchRequest from "../framework/http/BatchRequest";
import _ from 'lodash';
import SettingsService from "./SettingsService";
import MessageService from "./MessageService";

const PROGRAM_CONFIG = "programConfig.js";
const CUSTOM_MESSAGES = "customMessages.json";

@Service("configFileService")
class ConfigFileService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.jsfiles = [PROGRAM_CONFIG];
        this.messagesFiles = [CUSTOM_MESSAGES];
    }

    saveConfigFiles(configFiles) {
        const db = this.db;
        this.db.write(() => configFiles.map((configFile) => db.create(ConfigFile.schema.name, configFile, true)));
    }

    getFile(fileName) {
        return this.db.objectForPrimaryKey(ConfigFile.schema.name, `${fileName.toLowerCase()}`);
    }

    getProgramConfigFile() {
        return this.getFile(PROGRAM_CONFIG);
    }

    getCustomMessages() {
        const configFile = this.db.objectForPrimaryKey(ConfigFile.schema.name, `${CUSTOM_MESSAGES.toLowerCase()}`);
        return _.isNil(configFile) ? null : JSON.parse(configFile.contents);
    }

    getAllFilesAndSave(cb, errorHandler) {
        const batchRequest = new BatchRequest();
        const configURL = `${this.getService(SettingsService).getSettings().serverURL}/ext`;
        let configs = [];
        this.jsfiles.map((file) =>
            batchRequest.addText(`${configURL}/${file}`,
                (resp) => configs.push(ConfigFile.create(file, resp)),
                errorHandler));
        this.messagesFiles.map((file) => batchRequest.add(`${configURL}/${file}`, (resp) => {
            configs.push(ConfigFile.create(file, JSON.stringify(resp)));
            const messageService = this.getService(MessageService);
            messageService.addTranslationsFrom(resp);
            messageService.addEnglishNameTranslations();
        }, errorHandler));
        batchRequest.fire(() => {
            cb();
            this.saveConfigFiles(configs);
        }, errorHandler);
    }
}

export default ConfigFileService;