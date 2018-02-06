var expect = require('chai').expect;
var assert = require('chai').assert;
var C = require('../health_modules/common');

describe('CommonTest', () => {
    it('addDays', () => {
        var date = new Date();
        var copiedDate = C.copyDate(date);
        expect(copiedDate.getYear()).is.equal(date.getYear());
        var newDate = C.addDays(date, 0);
        expect(newDate.getYear()).is.equal(date.getYear());
        expect(newDate.getMonth()).is.equal(date.getMonth());
        expect(newDate.getDay()).is.equal(date.getDay());
    });

    it('show BMI in 1 decimal precision', () => {
        const bmi = C.calculateBMI(35, 160);
        assert.equal(bmi, 13.7);
    });
});