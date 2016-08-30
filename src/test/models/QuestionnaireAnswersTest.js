import { expect } from 'chai';
import QuestionnaireAnswers from '../../js/models/QuestionnaireAnswers';
import Duration from "../../js/models/Duration";

describe('QuestionnaireAnswers', () => {
    var qa;

    beforeEach(function() {
        qa = new QuestionnaireAnswers({name: "foo"});
        qa.currentQuestion = "bar";
        qa.currentAnswerValue = "baz";
    });

    it('Should get current answer', () => {
        expect(qa.currentAnswer.value).to.equal("baz");
    });

    it('To Array', () => {
        expect(qa.toArray().length).to.equal(1);
    });

    it('Current Answer Is Empty', () => {
        expect(qa.currentAnswerIsEmpty).is.false;
        
        qa.currentAnswerValue = "";
        expect(qa.currentAnswerIsEmpty).is.true;

        qa.currentAnswerValue = " ";
        expect(qa.currentAnswerIsEmpty).is.true;

        qa.currentAnswerValue = new Date();
        expect(qa.currentAnswerIsEmpty).is.false;
        
        qa.currentAnswerValue = undefined;
        expect(qa.currentAnswerIsEmpty).is.true;

        qa.currentAnswerValue = new Duration(null, Duration.Month);
        expect(qa.currentAnswerIsEmpty).is.true;
    });
});