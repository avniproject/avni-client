import QuestionAnswer from "./QuestionAnswer";
import Answer from "./Answer";
import RuleContext from "./RuleContext";
import _ from 'lodash';
import Duration from './Duration';
import General from '../utility/General';

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
        var questionAnswersArray = [];
        this.questionAnswers.forEach((answer, question, questionAnswers) => questionAnswersArray.push(QuestionAnswer.newInstance(question, answer)));
        return questionAnswersArray;
        // return Array.from(this.questionAnswers.entries())
        //     .filter(([key, value])=> !this.isAnswerEmpty(value))
        //     .map(([key, value])=> Object.assign({}, {
        //         key: key,
        //         value: value
        //     }));
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