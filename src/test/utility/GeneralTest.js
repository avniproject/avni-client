import {expect} from 'chai';
import General from '../../js/utility/General'

describe('General', () => {
    it('replaceAndroidIncompatibleChars', () => {
        const nameWithAllIncompatibleCharacters = "a|b\\c?d* <e\"f:>g+[]/'";
        expect(General.replaceAndroidIncompatibleChars(nameWithAllIncompatibleCharacters)).to.equal("a_b_c_d_ _e_f__g_____");
    });

    it('formatDate', () => {
        expect(General.formatDate(new Date('2011-04-11'))).is.equal('11-04-2011');
    });

    it('isAnswerNotWithinRange', () => {
        const question = {lowAbsolute: 10, hiAbsolute: 65};
        expect(General.isAnswerNotWithinRange(20, question)).is.false;
        expect(General.isAnswerNotWithinRange(10, question)).is.false;
        expect(General.isAnswerNotWithinRange(65, question)).is.false;
        expect(General.isAnswerNotWithinRange(5, question)).is.true;
        expect(General.isAnswerNotWithinRange(66, question)).is.true;
    });
});