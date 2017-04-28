import _ from "lodash";

class MultipleCodedValues {
    constructor(answer) {
        this.answer = _.isNil(answer) ? [] : answer;
    }

    push(answerUUID) {
        this.answer.push(answerUUID);
        return this;
    }

    isAnswerAlreadyPresent(conceptUUID) {
        return _.some(this.answer, (item) => item === conceptUUID);
    }

    removeAnswer(conceptUUID) {
        _.remove(this.answer, (item) => item === conceptUUID);
    }

    toggleAnswer(answerUUID) {
        if (this.isAnswerAlreadyPresent(answerUUID)) {
            this.removeAnswer(answerUUID);
        } else {
            this.push(answerUUID);
        }
    }

    getValue() {
        return this.answer;
    }

    get toResource() {
        return this.getValue();
    }

    cloneForEdit() {
        const multipleCodedValues = new MultipleCodedValues();
        multipleCodedValues.answer = this.answer;
        return multipleCodedValues;
    }

    get isSingleCoded() {
        return false;
    }

    get isMultipleCoded() {
        return true;
    }
}

export default MultipleCodedValues;