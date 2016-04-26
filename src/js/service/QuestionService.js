import stroke from '../../config/stroke.json';
import BaseService from './BaseService.js';
import Service from '../framework/Service.js';

@Service("questionService")
class QuestionService extends BaseService {
    constructor(db) {
        super(db);
        this.questionnaires = new Map();
        this.questionnaires.set("stroke", stroke);
    }

    getQuestion(questionnaireName, questionNumber) {
        var questionnaire = this.questionnaires.get(questionnaireName);
        return questionnaire[questionNumber];
    }
}

export default QuestionService;