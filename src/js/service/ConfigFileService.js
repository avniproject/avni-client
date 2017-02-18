import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import ConfigFile from '../models/ConfigFile';
import BatchRequest from "../framework/http/BatchRequest";
import _ from 'lodash';

@Service("configFileService")
class ConfigFileService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.encounterDecisionFile = "encounterDecision.js";
        this._createFileHandlers();
    }

    saveDecisionConfig(fileName, decisionCode) {
        const db = this.db;
        this.db.write(()=> db.create(ConfigFile.schema.name, ConfigFile.toDB(fileName, decisionCode), true));
    }

    getDecisionConfig() {
        return this.db.objectForPrimaryKey(ConfigFile.schema.name, `${this.encounterDecisionFile.toLowerCase()}`);
    }

    _createFileHandlers() {
        this.fileHandlers = {};
        this.fileHandlers[`${this.encounterDecisionFile}`] = (response) => this.saveDecisionConfig("encounterDecision.js", response);
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