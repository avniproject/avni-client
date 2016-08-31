import {expect} from 'chai';
import Decision from "../../js/models/Decision";
import QuestionAnswer from "../../js/models/QuestionAnswer";
import DecisionSupportSession from "../../js/models/DecisionSupportSession";

describe('Decision Support Session', () => {
    it('getAnswerFor', () => {
        var session = DecisionSupportSession.newInstance(
            "foo",
            [Decision.newInstance("abc", "A", "ZZZ")],
            [QuestionAnswer.newInstance("Q1", "A1")],
            new Date()
        );
        expect(DecisionSupportSession.getAnswerFor("Q1", session)[0].value).to.equal("A1");
    });
});