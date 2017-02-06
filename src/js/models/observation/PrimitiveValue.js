import _ from "lodash";
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
}

export default PrimitiveValue;