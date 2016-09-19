import React from 'react';
import {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import QuestionAnswerView from '../../../js/views/questionAnswer/QuestionAnswerView';
import QuestionnaireService from "../../../js/service/QuestionnaireService";
import Question from "../../../js/views/questionAnswer/Question";
import AppState from "../../../js/hack/AppState"
import PreviousNextSave from "../../../js/views/common/PreviousNextSave";
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";
import SampleQuestionnaire from "../../resources/sample-questionnaire.json";
import Diabetes from "../../resources/diabetes.json";
import Concepts from "../../resources/sample-concepts.json";
import _ from "lodash";
import AnswerList from "../../../js/views/questionAnswer/AnswerList";
import QuestionAnswerTabView from "../../../js/views/common/QuestionAnswerTabView";

describe('Question Answer View Test', () => {

    function getService() {
        return {
            "getI18n": function () {
                return {
                    t: function (t) {
                        return t;
                    }
                };
            },
            "questionnaire": new QuestionnaireService(undefined, undefined, undefined)
        };
    }

    function makeConceptService(conceptName) {
        const conceptToRet = _.find(Concepts, (concept)=>concept.name === conceptName);
        return {getConceptByName: () => conceptToRet};
    }

    it('should have `Multiple Choice Question 1` as the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getDB: ()=> ({
                objects: function () {
                    return [{"locale": {"selectedLocale": "en"}}]
                }
            }),
            getService: getService
        };

        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire, makeConceptService("Multiple Choice Question 1"));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        const wrapper = shallow(<QuestionAnswerView params=
                                                        {{
                                                            questionNumber: 0,
                                                            questionnaire: simpleQuestionnaire
                                                        }}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(AnswerList)).to.have.length(1);
        expect(wrapper.find(PreviousNextSave)).to.have.length(1);
        expect(wrapper.find(QuestionAnswerTabView)).to.have.length(1);
    });

    it('when Numeric is the first question', () => {
        const context = {
            navigator: ()=> ({}),
            getDB: ()=> ({
                objects: function () {
                    return [{"locale": {"selectedLocale": "en"}}]
                }
            }),
            getService: getService
        };

        var simpleQuestionnaire = new SimpleQuestionnaire(Diabetes, makeConceptService("Numeric Question"));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        const wrapper = shallow(<QuestionAnswerView
            params={{questionNumber: 0, questionnaire: simpleQuestionnaire}}/>, {context});
        expect(wrapper.find(Question)).to.have.length(1);
        expect(wrapper.find(TextInput)).to.have.length(1);
        expect(wrapper.find(PreviousNextSave)).to.have.length(1);
        expect(wrapper.find(QuestionAnswerTabView)).to.have.length(1);
    });
});