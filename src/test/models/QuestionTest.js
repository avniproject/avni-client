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

    it('isRangeViolated for mandatory question with range', () => {
        const question = new Question({"mandatory": true}, {
            "datatype": {"name": "Numeric"},
            "lowAbsolute": 10,
            "hiAbsolute": 65
        });
        expect(question.isRangeViolated(new Answer("a"))).is.true;
        expect(question.isRangeViolated(new Answer(20))).is.false;
        expect(question.isRangeViolated(new Answer(10))).is.false;
        expect(question.isRangeViolated(new Answer(65))).is.false;
        expect(question.isRangeViolated(new Answer(5))).is.true;
        expect(question.isRangeViolated(new Answer(66))).is.true;
    });

    it('isRangeViolated for mandatory question without range', () => {
        var question = new Question({"mandatory": true}, {"datatype": {"name": "Numeric"}});
        expect(question.isRangeViolated(new Answer(20))).is.false;
        expect(question.isRangeViolated(new Answer())).is.false;
        expect(question.isRangeViolated(new Answer(null))).is.false;

        question = new Question({"mandatory": true}, {"datatype": {"name": "Text"}});
        expect(question.isRangeViolated(new Answer("1"))).is.false;
    });

    it('isRangeViolated for optional question with range', () => {
        const question = new Question({"mandatory": false}, {
            "datatype": {"name": "Numeric"},
            "lowAbsolute": 10,
            "hiAbsolute": 65
        });
        expect(question.isRangeViolated(new Answer(undefined))).is.false;
        expect(question.isRangeViolated(new Answer(null))).is.false;
        expect(question.isRangeViolated(new Answer("a"))).is.true;

        expect(question.isRangeViolated(new Answer(20))).is.false;
        expect(question.isRangeViolated(new Answer(10))).is.false;
        expect(question.isRangeViolated(new Answer(65))).is.false;
        expect(question.isRangeViolated(new Answer(5))).is.true;
        expect(question.isRangeViolated(new Answer(66))).is.true;
    });

    it('isRangeViolated for optional question without range', () => {
        const question = new Question({"mandatory": false}, {"datatype": {"name": "Numeric"}});
        expect(question.isRangeViolated(new Answer())).is.false;
        expect(question.isRangeViolated(new Answer(null))).is.false;
        expect(question.isRangeViolated(new Answer(20))).is.false;
    });

    it('isRangeViolated for numeric questions with no range specified', () => {
        const question = new Question({"mandatory": true}, {
            "datatype": {"name": "Numeric"},
            "lowAbsolute": null,
            "hiAbsolute": null
        });
        expect(question.isRangeViolated(new Answer(20))).is.false;
    });

    it('isMandatory', () => {
        const question = new Question({});
        expect(question.isMandatory).is.true;
    });

    it('isRangeViolated is false float values', ()=> {
        const question = new Question({"mandatory": false}, {
            "datatype": {"name": "Numeric"},
            "lowAbsolute": 0,
            "hiAbsolute": 50
        });
        expect(question.isRangeViolated(new Answer("20"))).to.be.false;
        expect(question.isRangeViolated(new Answer("20.012"))).to.be.true;
        expect(question.isRangeViolated(new Answer("1.1"))).to.be.true;
        expect(question.isRangeViolated(new Answer("1.0"))).to.be.false;
        expect(question.isRangeViolated(new Answer("0.1"))).to.be.true;
        expect(question.isRangeViolated(new Answer(".1"))).to.be.true;
    });
});