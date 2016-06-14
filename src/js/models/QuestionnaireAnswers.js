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
    
    get value() {
        return this.questionAnswers;
    }

    toArray() {
        var questionAnswerPairs = [];
        this.questionAnswers.forEach((answer, question, questionAnswers) => questionAnswerPairs.push({question, answer}));
        return questionAnswerPairs;
    }
}

export default QuestionnaireAnswers;