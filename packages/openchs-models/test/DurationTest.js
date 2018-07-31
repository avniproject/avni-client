import {assert} from 'chai';
import Duration from "../src/Duration";

describe('DurationTest', () => {
    it('Duration Value', () => {
        assert.equal(new Duration(null, Duration.Year).durationValueAsString, '');
        assert.equal(new Duration('1', Duration.Year).durationValueAsString, '1');
    });

    it('toString', () => {
        assert.equal(new Duration(2, Duration.Year).toString(), '2 years');
        assert.equal(new Duration(3, Duration.Month).toString(), '3 months');
    });

    it('In Years', () => {
        assert.equal(new Duration(2, Duration.Year).inYears, 2);
        assert.equal(new Duration(3, Duration.Month).inYears, 0.25);
    });

    it('fromToday', () => {
        assert.equal(Duration.fromDataEntryDate(Duration.Month, new Date(2017, 3, 1), new Date(2017, 5, 7)).durationValue, 2);
        assert.equal(Duration.fromDataEntryDate(Duration.Week, new Date(2017, 3, 1), new Date(2017, 5, 7)).durationValue, 9);
    });

    it('Duration between', () => {
        assert.equal(Duration.durationBetween(new Date(2018, 5, 1), new Date(2018, 5, 29)).toString(), '28 days');
        assert.equal(Duration.durationBetween(new Date(2018, 5, 1), new Date(2018, 6, 1)).toString(), '1 months');
        assert.equal(Duration.durationBetween(new Date(2018, 5, 1), new Date(2018, 6, 16)).toString(), '1.5 months');
        assert.equal(Duration.durationBetween(new Date(2018, 5, 1), new Date(2019, 7, 1)).toString(), '14 months');
    });
});