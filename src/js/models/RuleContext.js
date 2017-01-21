//RuleContext could be used outside the this codebase by the decision support rules defined by disease modules and implementations

class RuleContext {
    constructor(questionAnswers) {
        this.questionAnswers = questionAnswers;
    }

    getAnswerFor(questionName) {
        return this.questionAnswers.get(questionName);
    }

    getDurationInYears(questionName) {
        return this.questionAnswers.get(questionName).inYears;
    }
}

export default RuleContext;