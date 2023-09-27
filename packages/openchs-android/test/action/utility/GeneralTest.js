import {expect, assert} from "chai";
import General from "../../../src/utility/General";
import {Duration} from 'avni-models';

describe('General', () => {
    it('replaceAndroidIncompatibleChars', () => {
        const nameWithAllIncompatibleCharacters = "a|b\\c?d* <e\"f:>g+[]/'";
        expect(General.replaceAndroidIncompatibleChars(nameWithAllIncompatibleCharacters)).to.equal("a_b_c_d_ _e_f__g_____");
    });

    it('formatDate', () => {
        expect(General.formatDate(new Date('2011-04-11'))).is.equal('11-04-2011');
    });

    it('formatValue', () => {
        expect(General.formatValue('abc')).is.equal('abc');
        General.formatValue(new Duration(10, Duration.Year));
    });

    it('isNotEmptyOrNil', () => {
        expect(General.isNilOrEmpty(null)).is.true;
        expect(General.isNilOrEmpty('')).is.true;
        expect(General.isNilOrEmpty(undefined)).is.true;
        expect(General.isNilOrEmpty('      ')).is.true;
        expect(General.isNilOrEmpty([])).is.true;
        expect(General.isNilOrEmpty('HelloWorld')).is.false;
        expect(General.isNilOrEmpty({})).is.false;
    });

    it('randomUUID', () => {
        const randomUUID1 = General.randomUUID();
        const randomUUID2 = General.randomUUID();
        expect(randomUUID1).is.not.equal(randomUUID2);
    });

    it('isEmptyOrBlank', () => {
        const isEmptyOrBlank = General.isEmptyOrBlank;
        expect(isEmptyOrBlank()).to.be.true;
        expect(isEmptyOrBlank({})).to.be.true;
        expect(isEmptyOrBlank([])).to.be.true;
        expect(isEmptyOrBlank("")).to.be.true;
        expect(isEmptyOrBlank(new String(""))).to.be.true;
        expect(isEmptyOrBlank(null)).to.be.true;
        expect(isEmptyOrBlank(NaN)).to.be.true;
        expect(isEmptyOrBlank(0)).to.be.false;
        expect(isEmptyOrBlank("abc")).to.be.false;
        expect(isEmptyOrBlank(false)).to.be.false;
        expect(isEmptyOrBlank(true)).to.be.false;
    });

    it('logError should not fail', () => {
        General.setCurrentLogLevel(General.LogLevel.Debug);
        General.logError("Test", new Error()); //Correct usage
        General.logError("Test", "Some error message"); //Correct usage
        General.logError("Test"); //Incorrect usage, but should work when message is undefined
        General.logError(); //Incorrect usage, but should not fail when logging
    });

    it('should get date from time', function () {
        const date = General.toDateFromTime("05:23");
        assert.equal(date.getHours(), 5);
        assert.equal(date.getMinutes(), 23);
    });
});
