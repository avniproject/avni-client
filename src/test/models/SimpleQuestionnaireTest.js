import SimpleQuestionnaire from '../../js/models/SimpleQuestionnaire.js';
import Concepts from '../../js/models/Concepts.js';
import Sample from '../../config/sample-questionnaire.json';
import ConceptsData from '../../config/concepts.json';

import { expect } from 'chai';

describe('Simple Question', () => {
  it('Should load questions and their answers', () => {
    var simpleQuestionnaire = new SimpleQuestionnaire(Sample, new Concepts(ConceptsData));
    var currentQuestion = simpleQuestionnaire.currentQuestion();
    expect(currentQuestion.question).to.equal('Multiple Choice Question 1');
    expect(currentQuestion.answers.length).to.equal(2);
  });
});