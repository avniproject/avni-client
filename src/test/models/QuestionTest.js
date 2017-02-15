import {expect} from 'chai';
import Question from '../../js/models/Question';
import Answer from '../../js/models/Answer';

describe('QuestionTest', () => {
    it('hasRange', () => {
        var question = new Question({}, {"datatype": {"name": "Numeric"}});
        expect(question.hasRange()).to.equal(false);

        question = new Question({}, {"datatype": {"name": "Numeric"}, "lowAbsolute": 1, "hiAbsolute": 10});
        expect(question.hasRange()).to.equal(true);
    });

    it('isMandatory', () => {
        const question = new Question({});
        expect(question.isMandatory).is.true;
    });

    it('isRangeViolated is true for float values', ()=> {
        const question = new Question({"mandatory": false}, {
            "datatype": {"name": "Numeric"},
            "lowAbsolute": 0,
            "hiAbsolute": 50
        });
        expect(question.isRangeViolated(new Answer("20"))).to.be.false;
        expect(question.isRangeViolated(new Answer("20.012"))).to.be.false;
        expect(question.isRangeViolated(new Answer("1.1"))).to.be.false;
        expect(question.isRangeViolated(new Answer("1.0"))).to.be.false;
        expect(question.isRangeViolated(new Answer("0.1"))).to.be.false;
        expect(question.isRangeViolated(new Answer(".1"))).to.be.false;
    });
});