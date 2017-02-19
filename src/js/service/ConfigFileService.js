import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import ConfigFile from '../models/ConfigFile';
import BatchRequest from "../framework/http/BatchRequest";
import _ from 'lodash';
import SettingsService from "./SettingsService";

@Service("configFileService")
class ConfigFileService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.encounterDecisionFile = "encounterDecision.js";
        this.customMessageFile = "customMessages.json";
        this._createFileHandlers();
    }

    saveConfigFile(fileName, contents) {
        const db = this.db;
        this.db.write(()=> db.create(ConfigFile.schema.name, ConfigFile.create(fileName, contents), true));
    }

    getDecisionConfig() {
        return this.db.objectForPrimaryKey(ConfigFile.schema.name, `${this.encounterDecisionFile.toLowerCase()}`);
    }

    getCustomMessages() {
        const contents = this.db.objectForPrimaryKey(ConfigFile.schema.name, `${this.customMessageFile.toLowerCase()}`);
        return _.isNil(contents) ? null : JSON.parse(contents);
    }

    _createFileHandlers() {
        this.fileHandlers = {};
        this.fileHandlers[`${this.encounterDecisionFile}`] = (response) => this.saveConfigFile(this.encounterDecisionFile, response);
        this.fileHandlers[`${this.customMessageFile}`] = (response) => this.saveConfigFile(this.customMessageFile, response);
    }

    getAllFilesAndSave(cb, errorHandler) {
        const batchRequest = new BatchRequest();
        const configURL = `${this.getService(SettingsService).getServerURL()}/ext`;

        _.forOwn(this.fileHandlers, (handler, file) => {
            batchRequest.add(`${configURL}/${file}`, handler, errorHandler);
        });
        batchRequest.fire(cb, errorHandler);
    }
}

export default ConfigFileService;