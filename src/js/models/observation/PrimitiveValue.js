import _ from "lodash";
import Concept from "../Concept";
import moment from "moment";

class PrimitiveValue {
    constructor(value, datatype) {
        this.answer = this.valueFromString(value, datatype);
    }

    asDisplayDate() {
        return moment(this.answer).format('DD-MMM-YYYY');
    }

    getValue() {
        return this.answer;
    }

    get toResource() {
        return this.answer;
    }

    cloneForNewEncounter() {
        const primitiveValue = new PrimitiveValue();
        primitiveValue.answer = this.answer;
        return primitiveValue;
    }

    valueFromString(string, datatype) {
        if (datatype === Concept.dataType.Numeric) {
            return _.toNumber(string)
        }
        return string;
    }

    getValue() {
        return this.answer;
    }
}

export default PrimitiveValue;