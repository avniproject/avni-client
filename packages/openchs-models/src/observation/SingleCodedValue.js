import _ from "lodash";

class SingleCodedValue {
    constructor(answerUUID) {
        this.answer = answerUUID;
    }

    hasValue(answerUUID) {
        return this.answer === answerUUID;
    }

    getValue() {
        return this.answer;
    }

    get toResource() {
        return this.answer;
    }

    getConceptUUID() {
        return this.answer;
    }

    cloneForEdit() {
        const singleCodedValue = new SingleCodedValue();
        singleCodedValue.answer = this.answer;
        return singleCodedValue;
    }

    hasAnyAbnormalAnswer(abnormalAnswerUUIDs){
        return _.some(abnormalAnswerUUIDs, _.matches(this.answer));
    }

    get isSingleCoded() {
        return true;
    }

    get isMultipleCoded() {
        return false;
    }
}

export default SingleCodedValue;