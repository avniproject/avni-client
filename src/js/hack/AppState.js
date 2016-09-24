import QuestionnaireAnswers from "../models/QuestionnaireAnswers";
let instance = null;

class AppState {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }
    
    startQuestionnaireSession(questionnaire, i18n) {
        this.questionnaireAnswers = new QuestionnaireAnswers(questionnaire, i18n);
    }
}
export default new AppState();