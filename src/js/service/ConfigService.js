import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import QuestionnaireService from './QuestionnaireService';
import ConceptService from './ConceptService';
import SettingsService from './SettingsService';
import DecisionConfigService from './DecisionConfigService';
import {get} from '../framework/http/requests';


@Service("configService")
class ConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.getAllFilesAndSave = this.getAllFilesAndSave.bind(this);
        this.getFileFrom = this.getFileFrom.bind(this);
    }

    init(beans) {
        this.typeMapping = new Map([["questionnaires", beans.get(QuestionnaireService).saveQuestionnaire],
            ["concepts", (concepts) => concepts.map(beans.get(ConceptService).saveConcept)], ["decisionConfig", beans.get(DecisionConfigService).saveDecisionConfig]]);
    }

    getFileFrom(configURL) {
        return {
            of: (type) => ((fileName) => get(`${configURL}/${fileName}`, (response) =>
                this.typeMapping.get(type)(response, fileName)))
        };
    }

    getAllFilesAndSave() {
        const configURL = `${this.getService(SettingsService).getServerURL()}/fs/config`;
        get(`${configURL}/filelist.json`, (response) => {
            _.map(response, (fileNames, type) => fileNames.map(this.getFileFrom(configURL).of(type).bind(this)));
        });
    }
}

export default ConfigService;