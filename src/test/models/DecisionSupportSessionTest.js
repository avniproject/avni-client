import {expect} from 'chai';
import Decision from "../../js/models/Decision";
import QuestionAnswer from "../../js/models/QuestionAnswer";
import DecisionSupportSession from "../../js/models/DecisionSupportSession";

describe('Decision Support Session', () => {
    it('findQuestionAnswer', () => {
        var session = DecisionSupportSession.newInstance(
            "foo",
            [Decision.newInstance("abc", "A", "ZZZ")],
            [QuestionAnswer.newInstance("Q1", "A1")],
            new Date()
        );
        expect(DecisionSupportSession.findQuestionAnswer("Q1", session).question).to.equal("Q1");
    });
});