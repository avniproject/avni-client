import { expect } from 'chai';
import QuestionnaireAnswers from '../../js/models/QuestionnaireAnswers';

describe('QuestionnaireAnswers', () => {
    var qa;

    beforeEach(function() {
        qa = new QuestionnaireAnswers("foo");
        qa.currentQuestion = "bar";
        qa.currentAnswer = "baz";
    });

    it('Should get current answer', () => {
        expect(qa.currentAnswer).to.equal("baz");
    });

    it('To Array', () => {
        expect(qa.toArray().length).to.equal(1);
    });

    it('Current Answer Is Empty', () => {
        expect(qa.currentAnswerIsEmpty).is.false;
        
        qa.currentAnswer = "";
        expect(qa.currentAnswerIsEmpty).is.true;
        
        qa.currentAnswer = new Date();
        expect(qa.currentAnswerIsEmpty).is.false;
        
        qa.currentAnswer = undefined;
        expect(qa.currentAnswerIsEmpty).is.true;
    });
});