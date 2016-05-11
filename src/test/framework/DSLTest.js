import {expect} from 'chai';
import testDisease from './testDiseaseQuestionnaire';

describe('DSL Test', () => {
  it('Get the first question based of the questionnaire', () => {
    expect(testDisease.getQuestion()).to.equal("Do you feel any weakness?");
  });

  it('Get options for the first question of the questionnaire', () => {
    expect(testDisease.getOptions()).to.eql(["Yes", "No"])
  });
  
});