import General from '../utility/General';
import Duration from "./Duration";

class QuestionAnswer {
    static schema = {
        name: "QuestionAnswer",
        properties: {
            question: "string",
            answer: "string",
            unit: {type: "string", optional: true}
        }
    };

    static newInstance(question, answer) {
        var answerValue, unit;
        if (answer instanceof Duration) {
            answerValue = answer.durationValueAsString;
            unit = answer.durationUnit;
        } else if (answer instanceof Date) {
            answerValue = General.isoFormat(answer);
        } else {
            answerValue = answer;
        }
        return {
            question: question,
            answer: answerValue,
            unit: unit
        }
    }
}

export default QuestionAnswer;
