import React from 'react';
import {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import QuestionAnswerView from '../../../js/views/questionAnswer/QuestionAnswerView';
import QuestionnaireService from "../../../js/service/QuestionnaireService";
import Question from "../../../js/views/questionAnswer/Question";
import MultiSelectAnswerList from "../../../js/views/questionAnswer/MultiSelectAnswerList";
import AppState from "../../../js/hack/AppState"
import WizardButtons from "../../../js/views/primitives/WizardButtons";
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";
import ConfigurationData from "../../../js/service/ConfigurationData";

describe('Question Answer View Test', () => {
    it('should have `Multiple Choice Question 1` as the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getStore: ()=> ({
                objects: function () {
                    return [{"locale": {"selectedLocale": "en"}}]
                }
            }),
            getService: function () {
                return new QuestionnaireService(undefined, undefined, undefined);
            }
        };

        var simpleQuestionnaire = new SimpleQuestionnaire(ConfigurationData.sample, new Concepts(ConceptData.concepts));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        const wrapper = shallow(<QuestionAnswerView params=
                                                        {{
                                                            questionNumber: 0,
                                                            questionnaire: simpleQuestionnaire
                                                        }}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(MultiSelectAnswerList)).to.have.length(1);
        expect(wrapper.find(WizardButtons)).to.have.length(1);
    });

    it('when Numeric is the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getStore: ()=> ({
                objects: function () {
                    return [{"locale": {"selectedLocale": "en"}}]
                }
            }),
            getService: function () {
                return new QuestionnaireService(undefined, undefined, undefined);
            }
        };

        var simpleQuestionnaire = new SimpleQuestionnaire(ConfigurationData.diabetes, new Concepts(ConceptData.concepts));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        const wrapper = shallow(<QuestionAnswerView
            params={{questionNumber: 0, questionnaire: simpleQuestionnaire}}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(TextInput)).to.have.length(1);
        expect(wrapper.find(WizardButtons)).to.have.length(1);
    });
});