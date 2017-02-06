import _ from "lodash";

class SingleCodedValue {
    constructor(answerUUID) {
        this.answer = {};
        this.answer.conceptUUID = answerUUID;
    }

    hasValue(answerUUID) {
        return this.answer.conceptUUID === answerUUID;
    }

    getValue() {
        return this.answer.conceptUUID;
    }
}

export default SingleCodedValue;