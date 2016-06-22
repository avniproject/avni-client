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
        var questionnaire = AppState.questionnaireData.get(questionnaireName);
        if (questionnaire === undefined) return undefined;

        var conceptService = new ConceptService(this.db);
        return new SimpleQuestionnaire(questionnaire, conceptService.getConcepts());
    }

    getQuestionnaireNames() {
        const questionnaires = [];
        AppState.questionnaireData.forEach((answer, question, questionAnswers) => {
            questionnaires.push(question);
        });
        return questionnaires;
    }
}

export default QuestionnaireService;