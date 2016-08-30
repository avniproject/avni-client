class RuleContext {
    constructor(questionAnswers) {
        this.questionAnswers = questionAnswers;
    }

    getAnswerFor(questionName) {
        return this.questionAnswers.get(questionName);
    }
}

export default RuleContext;