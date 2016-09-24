import SimpleQuestionnaire from '../../js/models/SimpleQuestionnaire.js';
import SummaryField from '../../js/models/SummaryField';
import SampleQuestionnaire from '../resources/sample-questionnaire.json';
import DiabetesQuestionnaire from '../resources/diabetes.json';
import Concepts from '../resources/sample-concepts.json';
import _ from 'lodash';

import {expect} from 'chai';

describe('Simple Question', () => {

    function makeConceptService(conceptName) {
        const conceptToRet = _.find(Concepts, (concept)=>concept.name === conceptName);
        return {getConceptByName: () => conceptToRet};
    }

    it('Should load questions and their answers', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire,
            makeConceptService('Multiple Choice Question 1'));
        var question = simpleQuestionnaire.getQuestion(0);
        expect(question.name).to.equal('Multiple Choice Question 1');
        expect(question.answers.length).to.equal(2);
        expect(question.isFirstQuestion).to.be.true;
        expect(question.isLastQuestion).to.be.false;
        expect(question.isMandatory).to.be.true;
        expect(question.isMultiSelect).to.be.true;

    });

    it('Should load questions and their answers - 2', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(DiabetesQuestionnaire,
            makeConceptService('Numeric Question'));
        var question = simpleQuestionnaire.getQuestion(0);
        expect(question.name).to.equal('Numeric Question');
        expect(question.isMultiSelect).to.be.false;
    });

    it('Get Summary Fields', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire,
            makeConceptService('Multiple Choice Question 1'));
        expect(simpleQuestionnaire.summaryFields.length).to.equal(2);
        expect(simpleQuestionnaire.summaryFields[0].summaryFieldType).to.equal(SummaryField.Question);
        expect(simpleQuestionnaire.summaryFields[1].summaryFieldType).to.equal(SummaryField.DecisionKey);
    });


    it('Should Get Correct Index Given Question Name', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire,
            makeConceptService('Multiple Choice Question 1'));
        expect(simpleQuestionnaire.getQuestionIndex('Multiple Choice Question 1')).to.equal(0);
        expect(simpleQuestionnaire.getQuestionIndex('Numeric Question')).to.equal(1);
        expect(simpleQuestionnaire.getQuestionIndex('Date of Birth')).to.equal(2);
    });
});