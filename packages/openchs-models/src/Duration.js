import _ from 'lodash';
import moment from "moment";
import SingleCodedValue from "./observation/SingleCodedValue";

class Duration {
    static inDay(value) {
        return new Duration(value, Duration.Day);
    }

    static inWeek(value) {
        return new Duration(value, Duration.Week);
    }

    static Day = "days";
    static Week = "weeks";
    static Month = "months";
    static Year = "years";

    static inMonth(value) {
        return new Duration(value, Duration.Month);
    }

    static inYear(value) {
        return new Duration(value, Duration.Year);
    }

    static durationBetween(dateA, dateB) {
        const diff = moment(dateB).diff(dateA, 'months', true);
        if (diff >= 1) {
            return new Duration(Math.round(diff * 2) / 2, Duration.Month); // round to nearest .5
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
        const durationUnitText = this._durationValue <= 1 ? this.durationUnit.substring(0, this.durationUnit.length - 1) : this.durationUnit;
        return i18n ? `${this.durationValueAsString} ${i18n.t(durationUnitText.toLowerCase())}` : `${this.durationValueAsString} ${this.durationUnit}`;
    }

    getValue() {
        return {value: this.durationValue, unit: this.durationUnit};
    }

    toUnicodeString(i18n) {
        return this.toString(i18n).replace('.5', '\u00BD');
    }

    get isEmpty() {
        console.log(this._durationValue);
        return _.isNil(this._durationValue) || _.isEmpty(this._durationValue);
    }

    get inYears() {
        if (this.durationUnit === Duration.Month)
            return this.durationValue / 12;
        else
            return this.durationValue;
    }

    changeUnit(durationUnit) {
        return new Duration(this.durationValue, durationUnit);
    }

    changeValue(value) {
        return new Duration(value, this.durationUnit);
    }

    static fromDataEntryDate(durationUnit, date, dataEntryDate) {
        const durationValue = moment(dataEntryDate).diff(date, durationUnit);
        return new Duration(durationValue, durationUnit);
    }

    cloneForEdit() {
        return new Duration(this.durationValue, this.durationUnit);
    }

    dateInPastBasedOnToday(asPerDate) {
        return moment(asPerDate).subtract(this.durationValue, this.durationUnit).toDate();
    }
}

export default Duration;