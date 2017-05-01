import _ from 'lodash';
import moment from "moment";

class Duration {
    static Day = "Day";
    static Month = "Month";
    static Year = "Year";

    static inMonth(value) {
        return new Duration(value, Duration.Month);
    }

    static inYear(value) {
        return new Duration(value, Duration.Year);
    }

    static durationBetween(dateA, dateB) {
        const diff = moment(dateB).diff(dateA, 'months');
        if (diff > 0) {
            return new Duration(diff, Duration.Month);
        } else {
            return new Duration(moment(dateB).diff(dateA, 'days'), Duration.Day);
        }
    }

    constructor(durationValue, durationUnit) {
        this._durationValue = durationValue;
        this.durationUnit = durationUnit;
    }

    get isInYears() {
        return this.durationUnit === Duration.Year;
    }

    get durationValueAsString() {
        return _.toString(this._durationValue);
    }

    get durationValue() {
        return this._durationValue;
    }

    toString(i18n) {
        return i18n ? `${this.durationValueAsString} ${i18n.t(`${this.durationUnit}s`.toLowerCase())}` : `${this.durationValueAsString} ${this.durationUnit}s`;
    }

    get isEmpty() {
        return _.isNil(this._durationValue);
    }

    get inYears() {
        if (this.durationUnit === Duration.Month)
            return this.durationValue / 12;
        else
            return this.durationValue;
    }
}

export default Duration;