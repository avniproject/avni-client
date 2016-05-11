import {expect} from 'chai';
import testDisease from './testDiseaseQuestionnaire';

describe('DSL Test', () => {
  it('Get the first question based off the questionnaire', () => {
    expect(testDisease.getQuestion()).to.equal("Do you feel any weakness?");
  });
});