import Stroke from '../framework/stroke.js';
import BaseService from './BaseService.js';
import Service from '../framework/Service.js';
import ConceptService from './ConceptService.js';
import SimpleQuestionnaire from '../models/SimpleQuestionnaire.js';

import Sample from '../../config/sample-questionnaire.json';

@Service("questionnaireService")
class QuestionnaireService extends BaseService {
    constructor(props, context, db) {
        super(db);
        //this should come from offline database
        this.questionnaires = new Map();
        this.questionnaires.set("stroke", Stroke);
    }

    getQuestionnaire(questionnaireName) {
        var questionnaire = this.questionnaires.get(questionnaireName);
        if (questionnaire === undefined) {
          var conceptService = new ConceptService();
          questionnaire = new SimpleQuestionnaire(Sample, conceptService.getConcepts());
        }
        return questionnaire;
    }
}

export default QuestionnaireService;