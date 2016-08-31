import {expect} from 'chai';
import QuestionAnswer from '../../js/models/QuestionAnswer';
import Duration from "../../js/models/Duration";

describe('Question Answer', () => {
    var qa_string, qa_date, qa_duration, qa_strings;

    beforeEach(function() {
        qa_string = QuestionAnswer.newInstance("abc", "xyz");
        qa_strings = QuestionAnswer.newInstance("abc", ["x", "y"]);
        qa_date = QuestionAnswer.newInstance("abc", new Date('2011-04-09'));
        qa_duration = QuestionAnswer.newInstance("abc", new Duration('2', Duration.Year));
    });

    it('New Instance', () => {
        expect(qa_string.question).to.equal('abc');
        expect(qa_string.answers[0].value).to.equal('xyz');

        expect(qa_date.answers[0].value).to.equal('2011-04-09');

        expect(qa_duration.answers[0].value).to.equal('2');
        expect(qa_duration.answers[0].unit).to.equal(Duration.Year);
    });

    it('Answer As String', () => {
        expect(qa_string.answerAsExportableString()).to.equal('xyz');
        expect(qa_strings.answerAsExportableString()).to.equal('"x,y"');
        expect(qa_date.answerAsExportableString()).to.equal('2011-04-09');
        expect(qa_duration.answerAsExportableString()).to.equal('2 Years');
    });
});