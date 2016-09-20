import _ from 'lodash';
import SimpleQuestionnaire from './SimpleQuestionnaire';
import Duration from "./Duration";

class Question {
    constructor(questionConfiguration, questionConcept, isFirstQuestion, isLastQuestion) {
        this.questionConfiguration = questionConfiguration;
        this.questionConcept = questionConcept;
        this.isFirstQuestion = isFirstQuestion;
        this.isLastQuestion = isLastQuestion;
    }

    get name() {
        return this.questionConfiguration.name;
    }

    get questionDataType() {
        return this.questionConcept.datatype.name;
    }

    get isMandatory() {
        return _.isNil(this.questionConfiguration.mandatory) ? true : this.questionConfiguration.mandatory;
    }

    get isMultiSelect() {
        return _.isNil(this.questionConfiguration.multiSelect) ? false : this.questionConfiguration.multiSelect;
    }

    get answers() {
        return this.questionConcept.answers === undefined ? [] : this.questionConcept.answers;
    }

    get lowAbsolute() {
        return this.questionConcept.lowAbsolute;
    }

    get hiAbsolute() {
        return this.questionConcept.hiAbsolute;
    }

    hasRange() {
        return this.questionDataType === SimpleQuestionnaire.Numeric && !_.isNil(this.lowAbsolute);
    }

    isRangeViolated(answer) {
        if (answer.isNilOrEmpty()) return false;
        if (answer.isNotANumber || answer.isNotAnInteger) return true;

        if (_.isNil(this.lowAbsolute) || _.isNil(this.lowAbsolute)) return false;

        return (answer.value < this.lowAbsolute || answer.value > this.hiAbsolute);
    }

    get defaultValue() {
        const defaultValues = new Map([[SimpleQuestionnaire.Numeric, ''],
            [SimpleQuestionnaire.Duration, new Duration(null, Duration.Year)],
            [SimpleQuestionnaire.Text, ''],
            [SimpleQuestionnaire.Coded, []],
            [SimpleQuestionnaire.Date, undefined]]);

        return defaultValues.get(this.questionDataType);
    }
}

export default Question;