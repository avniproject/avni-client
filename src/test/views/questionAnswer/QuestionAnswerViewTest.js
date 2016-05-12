import React from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import QuestionAnswerView from '../../../js/views/questionAnswer/QuestionAnswerView';
import QuestionnaireService from "../../../js/service/QuestionnaireService";

describe.skip('Question Answer View Test', () => {
    it('should have `Multiple Choice Question 1` as the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getService: function () {
                return new QuestionnaireService(undefined, undefined, undefined);
            }
        };
        const wrapper = shallow(<QuestionAnswerView params={{diseaseName: 'Sample without control flow'}}/>, {context});
        console.log(JSON.stringify(wrapper.state));
        expect(wrapper.state.questionnaire).to.equal('Multiple Choice Question 1');
    });
});