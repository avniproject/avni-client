import {expect} from 'chai';
import testDisease from './../resources/testDiseaseQuestionnaire';

describe('DSL Test', () => {
  it('should get the first question based of the questionnaire', () => {
    expect(testDisease.getQuestion()).to.equal("Do you feel any weakness?");
  });

  it('should get options for the first question of the questionnaire', () => {
    expect(testDisease.getOptions()).to.eql(["Yes", "No"]);
    //.eq for a deep equal, sot he values of the objects are compared. .equal does an object comparison.
  });

  it("should give next question based on the answer", ()=> {
    const nextQuestion = testDisease.answer("Yes");
    expect(nextQuestion.getQuestion()).to.equal("How old are you?");
  });

});