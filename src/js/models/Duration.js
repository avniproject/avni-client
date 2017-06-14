import _ from 'lodash';
import moment from "moment";

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
        const durationUnitText = this._durationValue <= 1 ? this.durationUnit.substring(0, this.durationUnit.length - 1) : this.durationUnit;
        return i18n ? `${this.durationValueAsString} ${i18n.t(durationUnitText.toLowerCase())}` : `${this.durationValueAsString} ${this.durationUnit}`;
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

    changeUnit(durationUnit) {
        return new Duration(this.durationValue, durationUnit);
    }

    changeValue(value) {
        return new Duration(value, this.durationUnit);
    }

    static fromToday(durationUnit, date, today) {
        today = today ? today : new Date();
        const durationValue = moment(today).diff(date, durationUnit);
        return new Duration(durationValue, durationUnit);
    }

    dateInPastBasedOnToday(today) {
        today = today ? today : new Date();
        return moment(today).subtract(this.durationValue, this.durationUnit).toDate();
    }

    static basedOnToday(date, durationUnit, today) {
        today = today ? today : new Date();
        const durationValue = moment(today).diff(date, durationUnit);
        return new Duration(durationValue, durationUnit);
    }
}

export default Duration;