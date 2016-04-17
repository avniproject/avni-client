import stroke from '../../config/stroke.json';

class QuestionService {
  constructor() {
    this.questionnaires = new Map();
    this.questionnaires.set("stroke", stroke);
  }

  getQuestion(questionnaireName, questionNumber) {
    var questionnaire = this.questionnaires.get(questionnaireName);
    console.log(questionnaire);
    return questionnaire[questionNumber];
  }
}

export default new QuestionService();