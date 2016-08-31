import Answer from './Answer';
import Duration from "./Duration";
import _ from 'lodash';
import General from '../utility/General';

class QuestionAnswer {
    static schema = {
        name: "QuestionAnswer",
        properties: {
            question: "string",
            answers: {type: "list", objectType: "Answer"},
        }
    };

    constructor(question, answers) {
        this.question = question;
        this.answers = answers;
    }

    static newInstance(question, answer) {
        return new QuestionAnswer(question, Answer.newInstances(answer));
    }

    answerAsExportableString() {
        var str;
        if (this.answers.length === 1) {
            if (_.isNil(this.answers[0].unit)) str = _(this.answers[0].value).toString();
            else str = Duration.fromAnswer(this.answers[0]).toString();
        } else {
            var values = [];
            _(this.answers.map((answer) => {
                values.push(answer.value);
            }));
            str = values.toString();
        }

        return General.toExportable(str);
    }
}

export default QuestionAnswer;
