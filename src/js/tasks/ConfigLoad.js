import Task from './Task';
import Bootstrap from '../framework/bootstrap/Bootstrap';
import {get} from '../framework/http/requests';
import _ from 'lodash';

@Bootstrap("configLoad")
class ConfigLoad extends Task {
    constructor(settingService) {
        super(settingService);
        this.serverURL = this.settingService.getServerURL();
        this.typeMapping = new Map([["questionnaires", this._storeQuestionnaire],
            ["concepts", this._storeConcepts], ["conclusions", this._storeConclusion]]);
    }

    _storeQuestionnaire(questionnaire) {
        console.log("QUESTIONNAIRE");
        console.log(questionnaire);
    }

    _storeConcepts(concepts) {
        console.log(concepts);
    }

    _storeConclusion(conclusion) {
        console.log(conclusion);
    }

    _getFileOf(type) {
        return ((fileName) => get(`${this.serverURL}/${fileName}`, (response) =>
            this.typeMapping.get(type)(response)));

    }

    run() {
        get(`${this.serverURL}/filelist.json`, (response) => {
            _.map(response, (fileNames, type) => fileNames.map(this._getFileOf(type).bind(this)));
        });

    }
}

export default ConfigLoad;