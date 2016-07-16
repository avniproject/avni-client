import BaseService from './BaseService';
import Service from '../framework/bean/Service';
import ConceptService from './ConceptService';
import SimpleQuestionnaire from '../models/SimpleQuestionnaire';
import ConfigurationData from '../service/ConfigurationData';
import QuestionnaireNames from '../../config/questionnaireNames.json';

@Service("questionnaireService")
class QuestionnaireService extends BaseService {
    constructor(db) {
        super(db);
        this.saveQuestionnaire = this.saveQuestionnaire.bind(this);
    }

    getQuestionnaire(questionnaireName) {
        var questionnaire = ConfigurationData.questionnaireConfigurations.get(questionnaireName);
        if (questionnaire === undefined) return undefined;

        var conceptService = new ConceptService(this.db);
        return new SimpleQuestionnaire(questionnaire, conceptService.getConcepts());
    }

    getQuestionnaireNames() {
        return this.db.objects('Questionnaire').map((questionnaire) => questionnaire['name']);
    }

    _obj(value) {
        return {"value": value};
    }

    saveQuestionnaire(questionnaire) {
        questionnaire['decisionKeys'] = questionnaire['decisionKeys'].map(this._obj);
        questionnaire['summaryFields'] = questionnaire['summaryFields'].map(this._obj);
        const db = this.db;
        this.db.write(()=> db.create("Questionnaire", questionnaire, true));
    }
}

export default QuestionnaireService;