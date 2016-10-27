import {View, StyleSheet, ScrollView} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import AppHeader from "../primitives/AppHeader";
import IndividualHeader from "../individual/IndividualHeader";
import QuestionAnswerControl from "../questionAnswer/QuestionAnswerControl";
import TypedTransition from "../../framework/routing/TypedTransition";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualEncounterView";
    }

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={{flex: 1}} keyboardShouldPersistTaps={true}>
                <AppHeader title={this.props.params.individual.name} parent={this}/>
                <IndividualHeader individual={this.props.params.individual}/>
                <QuestionAnswerControl questionnaire={this.props.params.questionnaire} questionNumber={this.props.params.questionNumber}
                                       onNext={() => {}}
                                       onPrevious={() => {TypedTransition.from(this).goBack()}}/>
            </View>
        );
    }
}

export default IndividualEncounterView;