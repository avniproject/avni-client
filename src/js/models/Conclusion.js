class Conclusion {
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
}

export default Conclusion;