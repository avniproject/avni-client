import _ from 'lodash';
import Duration from "./Duration";
import General from '../utility/General';

class Answer {
    static schema = {
        name: "Answer",
        properties: {
            value: "string",
            unit: {type: "string", optional: true}
        }
    };

    constructor(value, unit) {
        if (_.isNil(value) && _.isNil(unit)) return;

        this.value = value;
        this.unit = unit;
    }

    isNilOrEmpty() {
        return _.isNil(this.value) || _.isEmpty(_.trim(this.value));
    }

    get isNotANumber() {
        return isNaN(this.value);
    }

    get isNotAnInteger() {
        return !Number.isInteger(parseFloat(this.value));
    }

    static newInstances(answer) {
        if (_.isNil(answer)) return;
        var answers = [];
        if (_.isArray(answer)) {
            answer.map((answerItem) => {
                answers.push(new Answer(answerItem));
            });
        } else if (answer instanceof Duration) {
            answers.push(new Answer(answer.durationValueAsString, answer.durationUnit));
        } else if (answer instanceof Date) {
            answers.push(new Answer(General.isoFormat(answer)));
        } else {
            answers.push(new Answer(answer));
        }
        return answers;
    }
}

export default Answer;