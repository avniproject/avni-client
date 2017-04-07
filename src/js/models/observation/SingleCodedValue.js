class SingleCodedValue {
    constructor(answerUUID) {
        this.answer = answerUUID;
    }

    hasValue = (answerUUID) => this.answer === answerUUID;

    getValue = () => this.answer;

    get toResource() {
        return [this.answer];
    }

    getConceptUUID = () => this.answer;

    cloneForEdit = () => new SingleCodedValue(this.answer);
}

export default SingleCodedValue;