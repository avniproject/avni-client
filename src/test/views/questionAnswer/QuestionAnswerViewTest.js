import React from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import QuestionAnswerView from '../../../js/views/questionAnswer/QuestionAnswerView';

describe.skip('Questionnaire Answer View Test', () => {
  it('should have `Numeric Questionnaire` as the first question', () => {
    const context = {navigator: ()=> ({})};
    const wrapper = shallow(<QuestionAnswerView params={{diseaseName: 'Sample without control flow'}}/>, {context});
    expect(wrapper.state('question')).to.equal('Numeric Questionnaire');
  });
});

