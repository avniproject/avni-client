import {expect} from 'chai';
import Duration from "../../js/models/Duration";

describe('DurationTest', () => {
    it('Duration Value', () => {
        expect(new Duration(null, Duration.Year).durationValueAsString).is.equal('');
        expect(new Duration('1', Duration.Year).durationValueAsString).is.equal('1');
    });

    it('toString', () => {
        expect(new Duration(2, Duration.Year).toString()).is.equal('2 years');
        expect(new Duration(3, Duration.Month).toString()).is.equal('3 months');
    });

    it('In Years', () => {
        expect(new Duration(2, Duration.Year).inYears).is.equal(2);
        expect(new Duration(3, Duration.Month).inYears).is.equal(0.25);
    });

    it('fromToday', () => {
        expect(Duration.fromToday(Duration.Month, new Date(2017, 3, 1), new Date(2017, 5, 7)).durationValue).is.equal(2);
        expect(Duration.fromToday(Duration.Week, new Date(2017, 3, 1), new Date(2017, 5, 7)).durationValue).is.equal(9);
    });

    it('basedOnToday', () => {
        const duration = Duration.basedOnToday(new Date(2017, 5, 10), Duration.Day, new Date(2017, 5, 13));
        expect(duration.durationValue).is.equal(3);
    });
});