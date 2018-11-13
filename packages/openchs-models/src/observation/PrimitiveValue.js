import _ from "lodash";
import Concept from "../Concept";
import moment from "moment";
import General from "../utility/General";

class PrimitiveValue {
    constructor(value, datatype) {
        this.value = value;
        this.datatype = datatype;
        this.answer = this._valueFromString();
    }

    asDisplayDate() {
        const format = !(General.hoursAndMinutesOfDateAreZero(this.answer)) && this.datatype === Concept.dataType.DateTime
            ? "DD-MMM-YYYY HH:mm" 
            : "DD-MMM-YYYY";
        return moment(this.answer).format(format);
    }

    asDisplayTime() {
        return General.toDisplayTime(this.answer);
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

    _valueFromString() {
        if (this.datatype === Concept.dataType.Numeric && !_.endsWith(this.value,'.')) {
            return _.toNumber(this.value);
        } else if (this.datatype === Concept.dataType.DateTime) {
            return new Date(Date.parse(this.value));
        } else if (this.datatype === Concept.dataType.Date) {
            let date = new Date(Date.parse(this.value));
            date.setHours(0, 0, 0, 0);
            return date;
        }

        return this.value;
    }
}

export default PrimitiveValue;