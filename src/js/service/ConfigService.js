import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import QuestionnaireService from './QuestionnaireService';
import ConceptService from './ConceptService';
import SettingsService from './SettingsService';
import DecisionConfigService from './DecisionConfigService';
import {get} from '../framework/http/requests';
import _ from 'lodash';
import {comp} from 'transducers-js';


@Service("configService")
class ConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.getAllFilesAndSave = this.getAllFilesAndSave.bind(this);
        this.getFileFrom = this.getFileFrom.bind(this);
    }

    init() {
        const conceptService = this.getService(ConceptService);
        this.typeMapping = new Map([["questionnaires", this.getService(QuestionnaireService).saveQuestionnaire],
            ["decisionConfig", this.getService(DecisionConfigService).saveDecisionConfig],
            ["concepts", (concepts) => concepts.map((concept)=>
                comp(conceptService.addConceptI18n,
                    conceptService.saveConcept)(concept))]]);
    }

    getFileFrom(configURL, cb) {
        return {
            of: (type) => ((fileName) => get(`${configURL}/${fileName}`, (response) =>
                comp(cb, this.typeMapping.get(type))(response, fileName)))
        };
    }

    getAllFilesAndSave(cb) {
        const configURL = `${this.getService(SettingsService).getServerURL()}/fs/config`;
        get(`${configURL}/filelist.json`, (response) => {
            return _.map(response, (fileNames, type) => fileNames.map(this.getFileFrom(configURL, cb).of(type).bind(this)));
        });
    }
}

export default ConfigService;