import QuestionAnswer from "./QuestionAnswer";
import Answer from "./Answer";
import RuleContext from "./RuleContext";
import _ from 'lodash';
import Duration from './Duration';
import General from '../utility/General';

class QuestionnaireAnswers {
    constructor(questionnaire, i18n) {
        this.questionAnswers = new Map();
        this.questionnaire = questionnaire;
        this.i18n = i18n;
    }

    set(question, answer) {
        this.currentQuestion = question;
        this.currentAnswerValue = answer;
        return this;
    }

    set currentQuestion(value) {
        this.questionCursor = value;
    }

    set currentAnswerValue(value) {
        this.questionAnswers.set(this.questionCursor, value);
    }

    get currentAnswer() {
        return this.getAnswerFor(this.questionCursor);
    }

    //external API method used by rules
    getAnswerFor(questionName) {
        return new Answer(this.questionAnswers.get(questionName));
    }

    get value() {
        return this.questionAnswers;
    }

    toArray() {
        return Array.from(this.questionAnswers.entries())
            .filter(([question, answer])=> !this.isAnswerEmpty(answer))
            .map(([question, answer])=> QuestionAnswer.newInstance(question, answer))
            .map((questionAnswer, index) => _.merge({}, {
                index: index,
                key: questionAnswer.question,
                value: questionAnswer.answerAsString(this.i18n)
            }));
    }

    toSchemaInstance() {
        return Array.from(this.questionAnswers.entries())
            .map(([question, answer])=>QuestionAnswer.newInstance(question, answer));
    }

    get questionnaireName() {
        return this.questionnaire.name;
    }

    get currentAnswerIsEmpty() {
        return this.isAnswerEmpty(this.currentAnswer.value)
    }

    isAnswerEmpty(value) {
        if (value instanceof Duration)
            return value.isEmpty;
        return General.isNilOrEmpty(value);
    }

    createRuleContext() {
        return new RuleContext(this.questionAnswers);
    }

    get questionnaireUUID() {
        return this.questionnaire.questionnaire.uuid;
    }
}

export default QuestionnaireAnswers;