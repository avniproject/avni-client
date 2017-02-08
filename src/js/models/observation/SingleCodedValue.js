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

    cloneForNewEncounter() {
        const singleCodedValue = new SingleCodedValue();
        singleCodedValue.answer = {};
        singleCodedValue.answer.conceptUUID = this.answer.conceptUUID;
        return singleCodedValue;
    }
}

export default SingleCodedValue;