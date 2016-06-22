import {expect} from 'chai';
import DecisionSupportSession from "../../js/models/DecisionSupportSession";
import Decision from "../../js/models/Decision";
import QuestionAnswer from "../../js/models/QuestionAnswer";
import SummaryField from "../../js/models/SummaryField";

describe('Summary Field', () => {
    it('Get value from session', () => {
        var session = DecisionSupportSession.newInstance(
            "foo",
            [Decision.newInstance("abc", "A", "ZZZ")],
            [QuestionAnswer.newInstance("Q1", "A1")],
            new Date()
        );
        expect(new SummaryField("abc", SummaryField.DecisionKey).getValueFrom(session)).to.equal("ZZZ");
        expect(new SummaryField("Q1", SummaryField.Question).getValueFrom(session)).to.equal("A1");
    });
});