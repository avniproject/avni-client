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

    it('isEmptyOrBlank should correctly identify empty values', () => {
        expect(C.isEmptyOrBlank()).to.be.true; 
        expect(C.isEmptyOrBlank({})).to.be.true; 
        expect(C.isEmptyOrBlank([])).to.be.true; 
        expect(C.isEmptyOrBlank("")).to.be.true;
        expect(C.isEmptyOrBlank(new String(""))).to.be.true; 
        expect(C.isEmptyOrBlank(null)).to.be.true; 
        expect(C.isEmptyOrBlank(NaN)).to.be.true; 
        expect(C.isEmptyOrBlank(0)).to.be.false;
        expect(C.isEmptyOrBlank("abc")).to.be.false; 
        expect(C.isEmptyOrBlank(false)).to.be.false; 
        expect(C.isEmptyOrBlank(true)).to.be.false; 
    });
});