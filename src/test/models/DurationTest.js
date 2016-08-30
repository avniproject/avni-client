import {expect} from 'chai';
import Duration from "../../js/models/Duration";

describe('DurationTest', () => {
    it('Duration Value', () => {
        expect(new Duration(null, Duration.Year).durationValueAsString).is.equal('');
        expect(new Duration('1', Duration.Year).durationValueAsString).is.equal('1');
    });

    it('toString', () => {
        expect(new Duration(2, Duration.Year).toString()).is.equal('2 Years');
        expect(new Duration(3, Duration.Month).toString()).is.equal('3 Months');
    });
});