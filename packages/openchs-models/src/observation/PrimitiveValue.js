import _ from "lodash";
import Concept from "../Concept";
import moment from "moment";
import General from "../utility/General";

class PrimitiveValue {
    constructor(value, datatype) {
        this.datatype = datatype;
        this.answer = this.valueFromString(value, datatype);
    }

    asDisplayDate() {
        const format = !(General.hoursAndMinutesOfDateAreZero(this.answer)) 
            ? "DD-MMM-YYYY HH:mm" 
            : "DD-MMM-YYYY";
        return moment(this.answer).format(format);
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
        } else if (datatype === Concept.dataType.Date || datatype === Concept.dataType.DateTime) {
            return new Date(Date.parse(string));
        }
        return string;
    }

    getValue() {
        return this.answer;
    }
}

export default PrimitiveValue;