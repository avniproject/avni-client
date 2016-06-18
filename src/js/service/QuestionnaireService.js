import BaseService from './BaseService.js';
import Service from '../framework/Service.js';
import ConceptService from './ConceptService.js';
import SimpleQuestionnaire from '../models/SimpleQuestionnaire.js';
import AppState from '../hack/AppState';

@Service("questionnaireService")
class QuestionnaireService extends BaseService {
    constructor(db) {
        super(db);
    }

    getQuestionnaire(questionnaireName) {
        var questionnaire = AppState.questionnaires.get(questionnaireName);
        if (questionnaire === undefined) return undefined;

        var conceptService = new ConceptService(this.db);
        return new SimpleQuestionnaire(questionnaire, conceptService.getConcepts());
    }
}

export default QuestionnaireService;