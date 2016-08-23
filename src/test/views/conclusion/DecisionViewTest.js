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
                    "getDecisionConfig": function () {
                        return {"decisionCode": 'var getDecision = function (questionnaireAnswers) { console.log("FN CALLED"); var decision = {}; decision.name = "Treatment"; decision.code = "ABC001"; decision.value = "The patient should be referred to the hospital immediately as he may having tuberculosis"; decision.alert = "ALERT MESSAGE"; return [decision]; };'}
                    }

                }
            }
        };
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire, {});
        AppState.startQuestionnaireSession(simpleQuestionnaire);
        shallow(<DecisionView params={{}}/>, {context});
    });
});