import {expect} from 'chai';
import QuestionAnswer from '../../js/models/QuestionAnswer';
import Duration from "../../js/models/Duration";

describe('Question Answer', () => {
    it('New Instance', () => {
        qa = QuestionAnswer.newInstance("abc", "xyz");
        expect(qa.question).to.equal('abc');
        expect(qa.answer).to.equal('xyz');

        qa = QuestionAnswer.newInstance("abc", new Date('2011-04-09'));
        expect(qa.answer).to.equal('2011-04-09');

        qa = QuestionAnswer.newInstance("abc", new Duration('2', Duration.Year));
        expect(qa.answer).to.equal('2');
        expect(qa.unit).to.equal(Duration.Year);
    });
});