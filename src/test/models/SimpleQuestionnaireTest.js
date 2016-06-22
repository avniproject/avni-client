import SimpleQuestionnaire from '../../js/models/SimpleQuestionnaire.js';
import Concepts from '../../js/models/Concepts.js';
import Sample from '../../config/sample-questionnaire.json';
import Diabetes from '../../config/diabetes.json';
import ConceptsData from '../../config/concepts.json';
import SummaryField from '../../js/models/SummaryField';

import {expect} from 'chai';

describe('Simple Question', () => {
    it('Should load questions and their answers', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(Sample, new Concepts(ConceptsData));
        var questionAnswer = simpleQuestionnaire.currentQuestion();
        expect(questionAnswer.question).to.equal('Multiple Choice Question 1');
        expect(questionAnswer.answers.length).to.equal(2);
        expect(questionAnswer.isFirstQuestion).to.equal(true);
        expect(questionAnswer.isLastQuestion).to.equal(false);
    });

    it('Should load questions and their answers - 2', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(Diabetes, new Concepts(ConceptsData));
        var questionAnswer = simpleQuestionnaire.currentQuestion();
        expect(questionAnswer.question).to.equal('Numeric Question');
    });

    it('Get Summary Fields', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(Sample, new Concepts(ConceptsData));
        expect(simpleQuestionnaire.summaryFields.length).to.equal(2);
        expect(simpleQuestionnaire.summaryFields[0].summaryFieldType).to.equal(SummaryField.Question);
        expect(simpleQuestionnaire.summaryFields[1].summaryFieldType).to.equal(SummaryField.DecisionKey);
    });
});