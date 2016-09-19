import {View, ListView, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React, {Component} from 'react';
import TabularListView from '../common/TabularListView';
import QuestionAnswerTabView from '../common/QuestionAnswerTabView';
import AbstractComponent from '../../framework/view/AbstractComponent';
import TypedTransition from "../../framework/routing/TypedTransition";
import QuestionAnswerView from "../questionAnswer/QuestionAnswerView";

class DecisionSupportSessionComponent extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static styles = StyleSheet.create({
        questionAnswer: {
            fontSize: 18,
            flexDirection: 'column'
        },
        question: {
            color: '#0C59CF'
        },
        answer: {}
    });

    static propTypes = {
        decisions: React.PropTypes.array.isRequired,
        questionAnswers: React.PropTypes.array.isRequired,
        questionnaire: React.PropTypes.object.isRequired
    };

    render() {
        const decisions = this.props.decisions.map(({name, value}, index)=> {
            return {key: name, value: value, index: index};
        });

        return (
            <View>
                <QuestionAnswerTabView questionnaire={this.props.questionnaire}
                                       data={this.props.questionAnswers}
                                       message={"answersConfirmationTitle"}/>
                <TabularListView data={decisions} message={"decisionsMadeBySystem"}/>
            </View>);
    }
}

export default DecisionSupportSessionComponent;