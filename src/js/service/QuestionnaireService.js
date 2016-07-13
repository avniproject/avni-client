import BaseService from './BaseService'
import Service from '../framework/bean/Service'
import ConceptService from './ConceptService'
import SimpleQuestionnaire from '../models/SimpleQuestionnaire'
import ConfigurationData from '../service/ConfigurationData'

@Service("questionnaireService")
class QuestionnaireService extends BaseService {
    constructor(db) {
        super(db);
    }

    getQuestionnaire(questionnaireName) {
        var questionnaire = ConfigurationData.questionnaireConfigurations.get(questionnaireName);
        if (questionnaire === undefined) return undefined;

        var conceptService = new ConceptService(this.db);
        return new SimpleQuestionnaire(questionnaire, conceptService.getConcepts());
    }

    getQuestionnaireNames() {
        const questionnaires = [];
        ConfigurationData.questionnaireConfigurations.forEach((answer, question, questionAnswers) => {
            questionnaires.push(question);
        });
        return questionnaires;
    }
}

export default QuestionnaireService;