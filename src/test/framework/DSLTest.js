import {expect} from 'chai';
import testDisease from './../resources/testDiseaseQuestionnaire';

describe('DSL Test', () => {
  it('should get the first question based of the questionnaire', () => {
    expect(testDisease.getQuestion()).to.equal("Do you feel any weakness?");
    expect(testDisease.end()).to.be.false;
  });

  it('should get options for the first question of the questionnaire', () => {
    expect(testDisease.getOptions()).to.eql(["Yes", "No"]);
    expect(testDisease.end()).to.be.false;
    //INFO: .eq for a deep equal, sot he values of the objects are compared. .equal does an object comparison.
  });

  it("should give next question based on the answer", ()=> {
    const nextQuestion = testDisease.answer("Yes");
    expect(nextQuestion.getQuestion()).to.equal("How old are you?");
    expect(testDisease.end()).to.be.false;
  });

  it("should handle questions with numeric answers", ()=> {
    const nextQuestion = testDisease.answer("Yes").answer(40);
    expect(nextQuestion.getQuestion()).to.equal("How fast do you run?");
    expect(testDisease.end()).to.be.false;
  });

  it('should return end for the end of the questionnaire', ()=> {
    const end = testDisease.answer("Yes").answer(1);
    expect(end.getQuestion()).to.be.undefined;
    expect(end.end()).to.be.true;
  });

});