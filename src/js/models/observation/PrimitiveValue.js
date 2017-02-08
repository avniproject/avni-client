import moment from "moment";

class PrimitiveValue {
    constructor(value) {
        this.answer = value;
    }

    asDisplayDate() {
        return moment(this.answer).format('DD-MMM-YYYY');
    }

    getDisplayValue() {
        return this.answer;
    }

    cloneForNewEncounter() {
        const primitiveValue = new PrimitiveValue();
        primitiveValue.answer = this.answer;
        return primitiveValue;
    }
}

export default PrimitiveValue;