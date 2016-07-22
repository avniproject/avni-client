import Task from './Task';
import Bootstrap from '../framework/bootstrap/Bootstrap';
import {get} from '../framework/http/requests';
import _ from 'lodash';

@Bootstrap("configLoad")
class ConfigLoad extends Task {
    constructor(getBean) {
        super(getBean);
        this.serverURL = this.getBean("settingsService").getServerURL();
        this.typeMapping = new Map([["questionnaires", this.getBean("questionnaireService").saveQuestionnaire],
            ["concepts", (concepts) => concepts.map(this.getBean("conceptService").saveConcept)], ["decisionConfig", this.getBean("decisionConfigService").saveDecisionConfig]]);
    }

    _getFileOf(type) {
        return ((fileName) => get(`${this.serverURL}/${fileName}`, (response) =>
            this.typeMapping.get(type)(response, fileName)));

    }

    run() {
        get(`${this.serverURL}/filelist.json`, (response) => {
            _.map(response, (fileNames, type) => fileNames.map(this._getFileOf(type).bind(this)));
        });

    }
}

export default ConfigLoad;