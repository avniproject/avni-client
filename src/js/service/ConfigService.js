import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import SettingsService from "./SettingsService";
import DecisionConfigService from "./DecisionConfigService";
import BatchRequest from "../framework/http/BatchRequest";
import _ from 'lodash';

@Service("configService")
class ConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.encounterDecisionFile = "encounterDecision.js";
        this._createFileHandlers();
    }

    _createFileHandlers() {
        this.fileHandlers = {};
        this.fileHandlers[`${this.encounterDecisionFile}`] = (response) => this.getService(DecisionConfigService).saveDecisionConfig("encounterDecision.js", response);
    }

    getAllFilesAndSave(cb, errorHandler) {
        const batchRequest = new BatchRequest();
        const configURL = `${this.getService(SettingsService).getServerURL()}/ext`;

        _.forOwn(this.encounterDecisionFile, (handler, file) => {
            batchRequest.add(`${configURL}/${file}`, handler, errorHandler);
        });
        batchRequest.fire(cb, errorHandler);
    }
}

export default ConfigService;