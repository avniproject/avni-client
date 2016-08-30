import QuestionAnswer from "./QuestionAnswer";
import Answer from "./Answer";
import RuleContext from "./RuleContext";
import _ from 'lodash';
import Duration from './Duration';

class QuestionnaireAnswers {
    constructor(questionnaire) {
        this.questionAnswers = new Map();
        this.questionnaire = questionnaire;
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
        var questionAnswerPairs = [];
        this.questionAnswers.forEach((answer, question, questionAnswers) => questionAnswerPairs.push({
            question,
            answer
        }));
        return questionAnswerPairs;
    }

    toSchemaInstance() {
        var schemaInstance = [];
        this.questionAnswers.forEach((answer, question) => {
            schemaInstance.push(QuestionAnswer.newInstance(question, answer));
        });
        return schemaInstance;
    }
    
    get questionnaireName() {
        return this.questionnaire.name;
    }

    get currentAnswerIsEmpty() {
        if (this.currentAnswer.value instanceof Duration)
            return this.currentAnswer.value.isEmpty;
        return _.isNil(this.currentAnswer.value) || _.isEmpty(_.trim(this.currentAnswer.value));
    }

    createRuleContext() {
        return new RuleContext(this.questionAnswers);
    }
}

export default QuestionnaireAnswers;