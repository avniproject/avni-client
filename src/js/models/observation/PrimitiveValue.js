import _ from "lodash";
import Concept from "../Concept";
import moment from "moment";

class PrimitiveValue {
    constructor(value, dataType) {
        this.datatype = dataType;
        this.answer = this.valueFromString(value, dataType);
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

    cloneForEdit() {
        const primitiveValue = new PrimitiveValue();
        primitiveValue.answer = this.answer;
        return primitiveValue;
    }

    valueFromString(string, datatype) {
        if (datatype === Concept.dataType.Numeric && !_.endsWith(string,'.')) {
            return _.toNumber(string);
        } else if (datatype === Concept.dataType.Date) {
            return new Date(Date.parse(string));
        }
        return string;
    }

    valueAsString() {
        return (this.datatype === Concept.dataType.Date)? this.asDisplayDate(): _.toString(this.getValue());
    }

    getValue() {
        return this.answer;
    }
}

export default PrimitiveValue;