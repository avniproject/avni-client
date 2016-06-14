import QuestionnaireAnswers from "../models/QuestionnaireAnswers";
let instance = null;

class AppState {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }

    createNewQuestionnaire(questionnaireName) {
        this.questionnaireAnswers = new QuestionnaireAnswers(questionnaireName);
    }
}
export default new AppState();