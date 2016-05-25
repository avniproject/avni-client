class QuestionnaireAnswers {
    constructor(questionnaireName) {
        this.questionnaireName = questionnaireName;
        this.questionAnswers = new Map();
    }

    set currentQuestion(value) {
        this.questionCursor = value;
    }
    
    set currentAnswer(value) {
        this.questionAnswers.set(this.questionCursor, value);
    }
    
    get currentAnswer() {
        return this.questionAnswers.get(this.questionCursor);
    }
}

export default QuestionnaireAnswers;