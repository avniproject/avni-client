import {expect} from 'chai';
import QuestionAnswer from '../../js/models/QuestionAnswer';

describe('Question Answer', () => {
    it('New Instance', () => {
        qa = QuestionAnswer.newInstance("abc", new Date('2011-04-09'));
        expect(qa.answer).to.equal('2011-04-09');
    });
});