import _ from 'lodash';

class Duration {
    static Month = "Month";
    static Year = "Year";

    constructor(durationValue, durationUnit) {
        this._durationValue = durationValue;
        this.durationUnit = durationUnit;
    }

    static fromAnswer(answer) {
        return new Duration(answer.value, answer.unit);
    }

    get isInMonths() {
        return this.durationUnit === Duration.Month;
    }

    get isInYears() {
        return this.durationUnit === Duration.Year;
    }

    setAsMonths() {
        this.durationUnit = Duration.Month;
    }

    setAsYears() {
        this.durationUnit = Duration.Year;
    }

    set durationValue(durationValue) {
        if (_.isNil(durationValue))
            this._durationValue = durationValue;
        else
            this._durationValue = _.toNumber(durationValue);
    }

    get durationValueAsString() {
        return _.toString(this._durationValue);
    }

    get durationValue() {
        return this._durationValue;
    }

    toString() {
        return `${this.durationValueAsString} ${this.durationUnit}s`;
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