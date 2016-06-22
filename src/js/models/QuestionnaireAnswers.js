import QuestionAnswer from "./QuestionAnswer";

class QuestionnaireAnswers {
    constructor(questionnaire) {
        this.questionnaire = questionnaire;
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
        this.questionAnswers.forEach((answer, question, questionAnswers) => questionAnswerPairs.push({
            question,
            answer
        }));
        return questionAnswerPairs;
    }

    toSchemaInstance() {
        var schemaInstance = [];
        this.questionAnswers.forEach((answer, question) => {
            // if (answer instanceof)
            schemaInstance.push(QuestionAnswer.newInstance(question, answer));
        });
        return schemaInstance;
    }
    
    get questionnaireName() {
        return this.questionnaire.name;
    }

    get currentAnswerIsEmpty() {
        const currentAnswer = this.currentAnswer;
        return currentAnswer === undefined || (!(currentAnswer instanceof Date) && !(currentAnswer));
    }
}

export default QuestionnaireAnswers;