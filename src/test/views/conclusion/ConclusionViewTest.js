import React, {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import ConclusionView from '../../../js/views/conclusion/ConclusionView';
import QuestionnaireAnswers from "../../../js/models/QuestionnaireAnswers";
import AppState from "../../../js/hack/AppState"

describe('Conclusion View Test', () => {
    it('should have display conclusion', () => {
        const context = {
            navigator: ()=> ({})
        };
        AppState.questionnaireAnswers = new QuestionnaireAnswers('Sample without control flow');
        const wrapper = shallow(<ConclusionView params={{}}/>, {context});
        expect(wrapper.find(Text)).to.have.length(1);
    });
});