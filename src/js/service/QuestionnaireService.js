import BaseService from './BaseService';
import Service from '../framework/bean/Service';
import ConceptService from './ConceptService';
import SimpleQuestionnaire from '../models/SimpleQuestionnaire';
import _ from 'lodash';
import {Questionnaire} from '../models/Questionnaire';

@Service("questionnaireService")
class QuestionnaireService extends BaseService {
    constructor(db) {
        super(db);
        this.saveQuestionnaire = this.saveQuestionnaire.bind(this);
    }

    getQuestionnaire(questionnaireUUID) {
        const questionnaire = Questionnaire.fromDB(this.db.objectForPrimaryKey(Questionnaire.schema.name, questionnaireUUID));
        var conceptService = new ConceptService(this.db);
        return new SimpleQuestionnaire(questionnaire, conceptService.getConcepts());
    }

    getQuestionnaireNames() {
        return this.db.objects(Questionnaire.schema.name).map((questionnaire) => _.pick(questionnaire, ['uuid', 'name']));
    }


    saveQuestionnaire(questionnaire) {
        const db = this.db;
        this.db.write(()=> db.create("Questionnaire", Questionnaire.toDB(questionnaire), true));
    }
}

export default QuestionnaireService;