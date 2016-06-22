import General from '../utility/General';

class QuestionAnswer {
    static schema = {
        name: "QuestionAnswer",
        properties: {
            question: "string",
            answer: "string"
        }
    };

    static newInstance(question, answer) {
        return {
            question: question,
            answer: answer instanceof Date ? General.isoFormat(answer) : answer
        }
    }
}

QuestionAnswer.EntityName = "QuestionAnswer";
export default QuestionAnswer;
