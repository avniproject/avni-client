import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import QuestionnaireService from './QuestionnaireService';
import ConceptService from './ConceptService';
import SettingsService from './SettingsService';
import DecisionConfigService from './DecisionConfigService';
import {get} from '../framework/http/requests';
import _ from 'lodash';
import {comp} from 'transducers-js';
import BatchRequest from "../framework/http/BatchRequest";


@Service("configService")
class ConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.getAllFilesAndSave = this.getAllFilesAndSave.bind(this);
        this.getFileFrom = this.getFileFrom.bind(this);
        const batchRequests = new BatchRequest();
        this.fire = batchRequests.fire;
        this.get = batchRequests.get;
    }

    init() {
        const conceptService = this.getService(ConceptService);
        this.typeMapping = new Map([["questionnaire.json", this.getService(QuestionnaireService).saveQuestionnaire],
            ["decision.js", this.getService(DecisionConfigService).saveDecisionConfig],
            ["concepts.json", (concepts) => concepts.map((concept)=>
                comp(conceptService.addConceptI18n,
                    conceptService.saveConcept)(concept))]]);
    }

    getFileFrom(configURL) {
        return {
            of: (type) => ((fileName) => this.get(`${configURL}/${fileName}`, (response) =>
                this.typeMapping.get(type)(response, fileName)))
        };
    }

    getAllFilesAndSave(cb) {
        const configURL = `${this.getService(SettingsService).getServerURL()}/fs/config`;
        get(`${configURL}/modules.json`, (response) => {
            _.forEach(response.modules, (moduleName) => {
                _.forEach(["questionnaire.json", "decision.js", "concepts.json"], (file) => {
                    get(`${configURL}/modules/${moduleName}/${file}`, (moduleFileContents) => {
                        this.typeMapping.get(file)(moduleFileContents, moduleName);
                    });
                });
            });
            this.fire(cb);
        });
    }
}

export default ConfigService;