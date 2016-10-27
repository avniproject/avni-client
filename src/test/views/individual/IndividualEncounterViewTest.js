import {Text} from 'react-native';
import React from 'react';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import TestContext from "../testframework/TestContext";
import IndividualEncounterView from "../../../js/views/individual/IndividualEncounterView";
import Individual from "../../../js/models/Individual";
import moment from "moment";
import AddressLevel from "../../../js/models/AddressLevel";
import AppState from "../../../js/hack/AppState";
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";
import SampleQuestionnaire from "../../resources/sample-questionnaire.json";
import ConceptService from "../../../js/service/ConceptService";
import QuestionAnswerControl from "../../../js/views/questionAnswer/QuestionAnswerControl";

describe('IndividualEncounterViewTest', () => {
    const context = new TestContext();

    it('open default consultation without program', () => {
        var simpleQuestionnaire = new SimpleQuestionnaire(SampleQuestionnaire, context.getService(ConceptService));
        AppState.startQuestionnaireSession(simpleQuestionnaire);

        var maya = Individual.create("maya", moment().subtract(5, 'years').toDate(), "Male", AddressLevel.create("Nijhma", 1));
        const wrapper = shallow(<IndividualEncounterView params=
                                                                 {{
                                                                     individual: maya,
                                                                     questionnaire: simpleQuestionnaire,
                                                                     questionNumber: 0
                                                                 }}/>, {context});
        expect(wrapper.find({title: 'maya'})).to.have.length(1);
        wrapper.find(QuestionAnswerControl).simulate('previous');
    });
});