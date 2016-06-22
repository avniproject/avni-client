import React, {Text, TextInput} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import DecisionView from '../../../js/views/conclusion/DecisionView';
import AppState from "../../../js/hack/AppState"
import SimpleQuestionnaire from "../../../js/models/SimpleQuestionnaire";
import ConceptData from "../../../js/service/ConceptData";

describe('Conclusion View Test', () => {
    it('should have display conclusion', () => {
        const context = {
            navigator: ()=> ({}),
            getService: ()=> ({})
        };
        var simpleQuestionnaire = new SimpleQuestionnaire(AppState.sample, ConceptData.concepts);
        AppState.startQuestionnaireSession(simpleQuestionnaire);
        shallow(<DecisionView params={{}}/>, {context});
    });
});