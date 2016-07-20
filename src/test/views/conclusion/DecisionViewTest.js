import React from 'react';
import {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import DecisionView from '../../../js/views/conclusion/DecisionView';
import AppState from "../../../js/hack/AppState"
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";

describe('Decision View Test', () => {
    it('should have display conclusion', () => {
        const context = {
            navigator: ()=> ({}),
            getService: ()=> ({})
        };
        var simpleQuestionnaire = new SimpleQuestionnaire(ConfigurationData.sample, ConceptData.concepts);
        AppState.startQuestionnaireSession(simpleQuestionnaire);
        shallow(<DecisionView params={{}}/>, {context});
    });
});