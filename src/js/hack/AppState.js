let instance = null;

class AppState {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }

    createNewQuestionnaire(questionnaireName) {
        this.questionnaireAnswers = new QuestionnaireAnswers(this.props.diseaseName);
    }
}
export default new AppState();