import {View, ListView, Text, StyleSheet, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import TypedTransition from "../../framework/routing/TypedTransition";
import QuestionAnswerView from "../questionAnswer/QuestionAnswerView";
import TabularListView from './TabularListView';

class QuestionAnswerTabView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.handleTabClick = this.handleTabClick.bind(this);
    }

    static propTypes = {
        data: React.PropTypes.array.isRequired,
        message: React.PropTypes.string.isRequired,
        questionnaire: React.PropTypes.object.isRequired,
    };

    handleTabClick(questionIndex) {
        TypedTransition.from(this).with({
            questionnaire: this.props.questionnaire,
            questionNumber: questionIndex
        }).to(QuestionAnswerView);
    }


    render() {
        return (
            <TabularListView message={this.props.message} data={this.props.data} handleClick={this.handleTabClick}/>
        );
    }
}

export default QuestionAnswerTabView;