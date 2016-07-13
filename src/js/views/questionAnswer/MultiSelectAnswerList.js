import {View, Text} from 'react-native';
import React, {Component} from 'react';
import AppState from "../../hack/AppState";
import AnswerList from "./AnswerList";

class MultiSelectAnswerList extends AnswerList {
    optionPressed(answer) {
        var answersMap = this.state.answersMap;
        const previousState = answersMap.get(answer);
        answersMap.set(answer, !previousState);
        AppState.questionnaireAnswers.currentAnswer = this.joinSelection(answersMap);
        this.setState({answersMap: answersMap});
    }
}

export default MultiSelectAnswerList;