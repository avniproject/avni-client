import {View, Text} from 'react-native';
import React, {Component} from 'react';
import AppState from "../../hack/AppState";
import AnswerList from "./AnswerList";

class SingleSelectAnswerList extends AnswerList {
    optionPressed(answer) {
        var answersMap = this.state.answersMap;
        const previousState = answersMap.get(answer);
        answersMap = this.genAnswerMap(this.props.answers);
        answersMap.set(answer, !previousState);
        AppState.questionnaireAnswers.currentAnswerValue = this.joinSelection(answersMap);
        this.setState({answersMap: answersMap});
    }
}

export default SingleSelectAnswerList;