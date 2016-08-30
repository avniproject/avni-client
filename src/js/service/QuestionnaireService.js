import BaseService from './BaseService';
import ConceptService from './ConceptService';
import Service from '../framework/bean/Service';
import SimpleQuestionnaire from '../models/SimpleQuestionnaire';
import _ from 'lodash';
import {Questionnaire} from '../models/Questionnaire';

@Service("questionnaireService")
class QuestionnaireService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.saveQuestionnaire = this.saveQuestionnaire.bind(this);
    }

    getQuestionnaire(questionnaireUUID) {
        const questionnaire = Questionnaire.fromDB(this.db.objectForPrimaryKey(Questionnaire.schema.name, questionnaireUUID));
        return new SimpleQuestionnaire(questionnaire, this.getService(ConceptService));
    }

    getQuestionnaireNames() {
        return this.db.objects(Questionnaire.schema.name).map((questionnaire) => _.pick(questionnaire, ['uuid', 'name']));
    }

    saveQuestionnaire(questionnaire) {
        const db = this.db;
        this.db.write(()=> db.create(Questionnaire.schema.name, Questionnaire.toDB(questionnaire), true));
    }
}

export default QuestionnaireService;