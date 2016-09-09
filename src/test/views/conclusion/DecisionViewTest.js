import React from 'react';
import {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import DecisionView from '../../../js/views/conclusion/DecisionView';
import AppState from "../../../js/hack/AppState";
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";
import SampleQuestionnaire from '../../resources/sample-questionnaire.json';

describe('Decision View Test', () => {
    it('should have display conclusion', () => {
        const context = {
            navigator: ()=> ({}),
            getService: ()=> {
                return {
                    "getI18n": function () {
                        return {
                            t: function (t) {
                                return t;
                            }
                        };
                    },
                    "getDecision": function () {
                        return [{name: "Treatment", code: "ABC001", value: "The patient should be referred to the hospital immediately as he may having tuberculosis", alert: "ALERT MESSAGE"}]
                    }
                }
            }
        };
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire, {});
        AppState.startQuestionnaireSession(simpleQuestionnaire);
        const wrapper = shallow(<DecisionView params={{}}/>, {context});
        expect(wrapper.instance().decisions).to.deep.be.equal([{
            name: 'Treatment',
            code: 'ABC001',
            value: 'The patient should be referred to the hospital immediately as he may having tuberculosis',
            alert: 'ALERT MESSAGE'
        }]);
    });
});