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
        if (_.isNil(question)) return;
        this.question = question;
        this.answers = answers;
    }

    static newInstance(question, answer) {
        return new QuestionAnswer(question, Answer.newInstances(answer));
    }

    answerAsExportableString() {
        return General.toExportable(this.answerAsString());
    }

    answerAsString(i18n) {
        var str;
        if (this.answers.length === 1) {
            if (_.isNil(this.answers[0].unit)) {
                str = this.answers[0].value.toString();
                str = i18n ? i18n.t(str, {defaultValue: str}) : str;
            }
            else str = Duration.fromAnswer(this.answers[0]).toString(i18n);
        } else {
            var values = [];
            this.answers.map((answer) => {
                values.push(i18n ? i18n.t(answer.value, {defaultValue: answer.value}) : answer.value);
            });
            str = values.toString();
        }
        return str;
    }
}

export default QuestionAnswer;
