import {View, ListView, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React, {Component} from 'react';
import TabularListView from '../common/TabularListView';
import QuestionAnswerTabView from '../common/QuestionAnswerTabView';
import AbstractComponent from '../../framework/view/AbstractComponent';

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
        decisions: React.PropTypes.object.isRequired,
        questionAnswers: React.PropTypes.array.isRequired,
        questionnaire: React.PropTypes.object
    };

    render() {
        const decisions = this.props.decisions.map(({name, value}, index)=> {
            return {key: name, value: value, index: index};
        });
        const QAComponent = this.props.questionnaire ? QuestionAnswerTabView : TabularListView;
        return (
            <View>
                <QAComponent questionnaire={this.props.questionnaire}
                             data={this.props.questionAnswers}
                             message={"answersConfirmationTitle"}/>
                <TabularListView data={decisions} message={"decisionsMadeBySystem"}/>
            </View>);
    }
}

export default DecisionSupportSessionComponent;