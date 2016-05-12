import React, {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import QuestionAnswerView from '../../../js/views/questionAnswer/QuestionAnswerView';
import QuestionnaireService from "../../../js/service/QuestionnaireService";
import Question from "../../../js/views/questionAnswer/Question";
import AnswerList from "../../../js/views/questionAnswer/AnswerList";

describe('Question Answer View Test', () => {
    it('should have `Multiple Choice Question 1` as the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getService: function () {
                return new QuestionnaireService(undefined, undefined, undefined);
            }
        };
        const wrapper = shallow(<QuestionAnswerView params={{diseaseName: 'Sample without control flow'}}/>, {context});
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
        const wrapper = shallow(<QuestionAnswerView params={{diseaseName: 'Diabetes'}}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(TextInput)).to.have.length(1);
        expect(wrapper.find(Text)).to.have.length(0);
    });
});