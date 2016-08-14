import {expect} from 'chai';
import Question from '../../js/models/Question';

describe('QuestionTest', () => {
    it('hasRange', () => {
        var question = new Question(undefined, {"datatype" : {"name" : "Numeric"}});
        expect(question.hasRange()).to.equal(false);

        question = new Question(undefined, {"datatype" : {"name": "Numeric"}, "lowAbsolute": 1, "hiAbsolute": 10});
        expect(question.hasRange()).to.equal(true);
    });

    it('isRangeViolated for mandatory question with range', () => {
        const question = new Question({"mandatory": true}, {"datatype" : {"name": "Numeric"}, "lowAbsolute": 10, "hiAbsolute": 65});
        expect(question.isRangeViolated("a")).is.false;
        expect(question.isRangeViolated(20)).is.false;
        expect(question.isRangeViolated(10)).is.false;
        expect(question.isRangeViolated(65)).is.false;
        expect(question.isRangeViolated(5)).is.true;
        expect(question.isRangeViolated(66)).is.true;
    });

    it('isRangeViolated for mandatory question without range', () => {
        const question = new Question({"mandatory": true}, {"datatype" : {"name": "Numeric"}});
        expect(question.isRangeViolated(20)).is.false;
        expect(question.isRangeViolated()).is.false;
        expect(question.isRangeViolated(null)).is.false;
    });

    it('isRangeViolated for optional question', () => {
        const question = new Question({"mandatory": false}, {"datatype" : {"name": "Numeric"}, "lowAbsolute": 10, "hiAbsolute": 65});
        expect(question.isRangeViolated()).is.false;
        expect(question.isRangeViolated(undefined)).is.false;

        expect(question.isRangeViolated(20)).is.false;
        expect(question.isRangeViolated(10)).is.false;
        expect(question.isRangeViolated(65)).is.false;
        expect(question.isRangeViolated(5)).is.true;
        expect(question.isRangeViolated(66)).is.true;
    });

    it('isRangeViolated for optional question without range', () => {
        const question = new Question({"mandatory": false}, {"datatype" : {"name": "Numeric"}});
        expect(question.isRangeViolated()).is.false;
        expect(question.isRangeViolated(null)).is.false;
        expect(question.isRangeViolated(20)).is.false;
    });

    it('Range is not violated for non-numeric questions', () => {
        const question = new Question(undefined, {"datatype" : {"name": "Text"}});
        expect(question.isRangeViolated("a")).is.false;
        expect(question.isRangeViolated()).is.false;
    });
});