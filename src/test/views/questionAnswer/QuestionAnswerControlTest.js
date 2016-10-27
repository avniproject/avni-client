import React from 'react';
import {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import QuestionAnswerControl from '../../../js/views/questionAnswer/QuestionAnswerControl';
import Question from "../../../js/views/questionAnswer/Question";
import AppState from "../../../js/hack/AppState"
import PreviousNextSave from "../../../js/views/common/PreviousNextSave";
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";
import SampleQuestionnaire from "../../resources/sample-questionnaire.json";
import Diabetes from "../../resources/diabetes.json";
import AnswerList from "../../../js/views/questionAnswer/AnswerList";
import QuestionAnswerTabView from "../../../js/views/common/QuestionAnswerTabView";
import TestContext from "../testframework/TestContext";
import ConceptService from "../../../js/service/ConceptService";

describe('Question Answer Control Test', () => {
    const context = new TestContext();

    it('should have `Multiple Choice Question 1` as the first question', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire, context.getService(ConceptService));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        const wrapper = shallow(<QuestionAnswerControl questionNumber={0} questionnaire={simpleQuestionnaire} onNext={() => {}}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(AnswerList)).to.have.length(1);
        expect(wrapper.find(PreviousNextSave)).to.have.length(1);
        expect(wrapper.find(QuestionAnswerTabView)).to.have.length(1);
    });

    it('when Numeric is the first question', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(Diabetes, context.getService(ConceptService));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        const wrapper = shallow(<QuestionAnswerControl questionNumber={0} questionnaire={simpleQuestionnaire} onNext={() => {}}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(TextInput)).to.have.length(1);
        expect(wrapper.find(PreviousNextSave)).to.have.length(1);
        expect(wrapper.find(QuestionAnswerTabView)).to.have.length(1);
    });
});