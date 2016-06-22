import QuestionnaireAnswers from "../models/QuestionnaireAnswers";
let instance = null;

class AppState {
    constructor() {
        if (!instance) {
            instance = this;
            this.diabetes = require('../../config/diabetes.json');
            this.sample = require('../../config/sample-questionnaire.json');

            this.questionnaireData = new Map();
            // this.questionnaireData.set(this.diabetes.name, this.diabetes);
            this.questionnaireData.set(this.sample.name, this.sample);
            this.questionnaireData.set(this.diabetes.name, this.diabetes);
        }
        return instance;
    }

    startQuestionnaireSession(questionnaire) {
        this.questionnaireAnswers = new QuestionnaireAnswers(questionnaire);
    }
}
export default new AppState();