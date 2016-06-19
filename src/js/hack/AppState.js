import QuestionnaireAnswers from "../models/QuestionnaireAnswers";
let instance = null;

class AppState {
    constructor() {
        if (!instance) {
            instance = this;
            this.diabetes = require('../../config/diabetes.json');
            this.sample = require('../../config/sample-questionnaire.json');

            this.questionnaires = new Map();
            // this.questionnaires.set(this.diabetes.name, this.diabetes);
            this.questionnaires.set(this.sample.name, this.sample);
            this.questionnaires.set(this.diabetes.name, this.diabetes);
        }
        return instance;
    }

    createNewQuestionnaire(questionnaireName) {
        this.questionnaireAnswers = new QuestionnaireAnswers(questionnaireName);
    }
}
export default new AppState();