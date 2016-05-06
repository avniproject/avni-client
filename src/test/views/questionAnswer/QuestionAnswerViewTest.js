import React from 'react-native';
import { shallow } from 'enzyme';
import { expect } from 'chai';
import QuestionAnswerView from '../../../js/views/questionAnswer/QuestionAnswerView';

describe('<QuestionAnswerView />', () => {
  it('should have `Numeric Question` as the first question', () => {
    const context = { navigator: ()=> ({}) };
    const wrapper = shallow(<QuestionAnswerView params={{diseaseName: 'Sample without control flow'}}/>, { context });
    expect(wrapper.state('question')).to.equal('Numeric Question');
  });
});

