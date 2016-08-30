import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import QuestionnaireService from './QuestionnaireService';
import ConceptService from './ConceptService';
import SettingsService from './SettingsService';
import DecisionConfigService from './DecisionConfigService';
import {get} from '../framework/http/requests';
import {Map} from 'immutable';
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
        this.batchGet = batchRequests.get;
    }

    init() {
        const conceptService = this.getService(ConceptService);
        this.typeMapping = Map({
            "questionnaire.json": this.getService(QuestionnaireService).saveQuestionnaire,
            "decision.js": this.getService(DecisionConfigService).saveDecisionConfig,
            "concepts.json": (concepts) => concepts.map((concept)=>
                comp(conceptService.addConceptI18n,
                    conceptService.saveConcept)(concept))
        });
    }

    getFileFrom(moduleURL) {
        return {
            with: (moduleName) => (fileName) => this.batchGet(`${moduleURL}/${moduleName}/${fileName}`, (response) =>
                this.typeMapping.get(fileName)(response, moduleName))
        };
    }

    getAllFilesAndSave(cb) {
        const configURL = `${this.getService(SettingsService).getServerURL()}/fs/config`;
        get(`${configURL}/modules.json`, (response) => {
            const fileTypes = Array.from(this.typeMapping.keys());
            response.modules
                .map((moduleName)=> fileTypes.map(this.getFileFrom(`${configURL}/modules`).with(moduleName)));
            this.fire(cb);
        });
    }
}

export default ConfigService;