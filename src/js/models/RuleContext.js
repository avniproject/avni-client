import _ from 'lodash';
class RuleContext {
    constructor(questionAnswers, i18n) {
        this.questionAnswers = questionAnswers;
        this.I18n = i18n;
    }

    getAnswerFor(questionName) {
        return this.questionAnswers.get(questionName);
    }

    getCodedAnswerFor(questionName) {
        const answers = this.getAnswerFor(questionName);
        return _.flatten([answers]).map(this.I18n.inDefaultLocale);
    }

    getDurationInYears(questionName) {
        var duration = this.questionAnswers.get(questionName);
        return duration.inYears;
    }
}

export default RuleContext;