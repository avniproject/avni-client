import {expect} from "chai";
import General from "../../../src/utility/General";
import {Duration} from 'openchs-models';

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

});