import {expect} from 'chai';
import RuleContext from "../../js/models/RuleContext";

describe('RuleContext Test', () => {
    const i18n = {inDefaultLocale: (t)=>`1${t}2`};

    it('Return translated output for single select answers', () => {
        const qa = new Map([["Question 1", "Answer 1"], ["Question 2", "Answer 2"]]);
        const ruleContext = new RuleContext(qa, i18n);
        expect(ruleContext.getCodedAnswerFor("Question 1")).to.be.deep.equal(["1Answer 12"]);
        expect(ruleContext.getCodedAnswerFor("Question 2")).to.be.deep.equal(["1Answer 22"]);
    });


    it('Return translated output for MultiSelectanswers', () => {
        const qa = new Map([["Question 1", ["Answer 1.0", "Answer 1.1", "Answer 1.2"]], ["Question 2", ["Answer 2.0", "Answer 2.1"]]]);
        const ruleContext = new RuleContext(qa, i18n);
        expect(ruleContext.getCodedAnswerFor("Question 1")).to.be.deep.equal(["1Answer 1.02", "1Answer 1.12", "1Answer 1.22"]);
        expect(ruleContext.getCodedAnswerFor("Question 2")).to.be.deep.equal(["1Answer 2.02", "1Answer 2.12"]);
    });
});