import React, {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import QuestionAnswerView from '../../../js/views/questionAnswer/QuestionAnswerView';
import QuestionnaireService from "../../../js/service/QuestionnaireService";
import Question from "../../../js/views/questionAnswer/Question";
import AnswerList from "../../../js/views/questionAnswer/AnswerList";
import QuestionnaireAnswers from "../../../js/models/QuestionnaireAnswers";
import AppState from "../../../js/hack/AppState"

describe('Question Answer View Test', () => {
    it('should have `Multiple Choice Question 1` as the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getService: function () {
                return new QuestionnaireService(undefined, undefined, undefined);
            }
        };
        AppState.questionnaireAnswers = new QuestionnaireAnswers('Sample without control flow');
        const wrapper = shallow(<QuestionAnswerView params=
                                                        {{questionNumber: 0}}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(AnswerList)).to.have.length(1);
        expect(wrapper.find(Text)).to.have.length(1);
    });

    it('when `Numeric` is the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getService: function () {
                return new QuestionnaireService(undefined, undefined, undefined);
            }
        };
        AppState.questionnaireAnswers = new QuestionnaireAnswers('Diabetes');
        const wrapper = shallow(<QuestionAnswerView params={{questionNumber: 0}}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(TextInput)).to.have.length(1);
        expect(wrapper.find(Text)).to.have.length(1);
    });
});