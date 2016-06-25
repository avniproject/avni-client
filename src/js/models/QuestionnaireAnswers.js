import QuestionAnswer from "./QuestionAnswer";

class QuestionnaireAnswers {
    constructor(questionnaire) {
        this.questionAnswers = new Map();
        this.questionnaire = questionnaire;
    }

    set currentQuestion(value) {
        this.questionCursor = value;
    }

    set currentAnswer(value) {
        this.questionAnswers.set(this.questionCursor, value);
    }

    get currentAnswer() {
        return this.getAnswerFor(this.questionCursor);
    }
    
    getAnswerFor(questionName) {
        return this.questionAnswers.get(questionName);
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
        return this.currentAnswer === undefined || (!(this.currentAnswer instanceof Date) && !(this.currentAnswer));
    }
}

export default QuestionnaireAnswers;