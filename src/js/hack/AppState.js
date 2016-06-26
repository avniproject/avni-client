import QuestionnaireAnswers from "../models/QuestionnaireAnswers";
let instance = null;

class AppState {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }
    
    startQuestionnaireSession(questionnaire) {
        this.questionnaireAnswers = new QuestionnaireAnswers(questionnaire);
    }
}
export default new AppState();