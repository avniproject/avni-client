class RuleContext {
    constructor(questionAnswers) {
        this.questionAnswers = questionAnswers;
    }

    getAnswerFor(questionName) {
        return this.questionAnswers.get(questionName);
    }

    getDurationInYears(questionName) {
        var duration = this.questionAnswers.get(questionName);
        return duration.inYears;
    }
}

export default RuleContext;