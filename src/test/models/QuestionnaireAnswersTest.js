import { expect } from 'chai';
import QuestionnaireAnswers from '../../js/models/QuestionnaireAnswers';

describe('QuestionnaireAnswers', () => {
    it('Should get current answer', () => {
        var qa = new QuestionnaireAnswers("foo");
        qa.currentQuestion = "bar";
        qa.currentAnswer = "baz";
        expect(qa.currentAnswer).to.equal("baz");
    });
});
