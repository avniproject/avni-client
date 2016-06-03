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
        var questionnaireAnswers = new QuestionnaireAnswers('Sample without control flow');
        questionnaireAnswers.currentQuestion = "foo";
        questionnaireAnswers.currentAnswer = "bar";
        AppState.questionnaireAnswers = questionnaireAnswers;
        shallow(<ConclusionView params={{}}/>, {context});
    });
});