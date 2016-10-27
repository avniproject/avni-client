import React from 'react';
import {Text} from 'react-native';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import TestContext from "../testframework/TestContext";
import QuestionAnswerView from "../../../js/views/questionAnswer/QuestionAnswerView";
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";
import AppState from "../../../js/hack/AppState"
import SampleQuestionnaire from "../../resources/sample-questionnaire.json";
import ConceptService from "../../../js/service/ConceptService";
import QuestionAnswerControl from "../../../js/views/questionAnswer/QuestionAnswerControl";

describe('QuestionAnswerViewTest', () => {
    const context = new TestContext();

    it('render', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire, context.getService(ConceptService));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        const wrapper = shallow(<QuestionAnswerView params={{
            questionNumber: 0,
            questionnaire: simpleQuestionnaire
        }}/>, {context});
        expect(wrapper.find(QuestionAnswerControl)).to.have.length(1);
    });
});