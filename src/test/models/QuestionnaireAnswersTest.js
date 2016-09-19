import {expect} from 'chai';
import QuestionnaireAnswers from '../../js/models/QuestionnaireAnswers';
import Duration from "../../js/models/Duration";

describe('QuestionnaireAnswers', () => {
    var qa;

    beforeEach(function () {
        qa = new QuestionnaireAnswers({name: "foo"});
        qa.currentQuestion = "bar";
        qa.currentAnswerValue = "baz";
    });

    it('Should get current answer', () => {
        expect(qa.currentAnswer.value).to.equal("baz");
    });

    it('Should not include empty answers in the array', ()=> {
        qa.set("foo1", "bar1");
        qa.set("foo2", "bar2");
        qa.set("foo3", "");
        qa.set("foo4", " ");
        qa.set("foo5", []);
        qa.set("foo6", new Duration(null, Duration.Month));
        qa.set("foo7", new Duration(12, Duration.Year));
        var questionnaireAnswersArray = qa.toArray();
        expect(questionnaireAnswersArray).to.have.length(4);
        expect(questionnaireAnswersArray).to.deep.have.members([
                {key: 'bar', value: 'baz', index: 0},
                {key: 'foo1', value: 'bar1', index: 1},
                {key: 'foo2', value: 'bar2', index: 2},
                {key: 'foo7', value: '12 Years', index: 3}
            ]
        );
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