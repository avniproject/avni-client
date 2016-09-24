import {View, Text, ListView} from 'react-native';
import React, {Component} from 'react';
import AnswerOption from './AnswerOption';
import AppState from "../../hack/AppState";
import SingleSelectAnswerListModel from "../viewmodel/SingleSelectAnswerListModel";
import MultiSelectAnswerListModel from "../viewmodel/MultiSelectAnswerListModel";
import AbstractComponent from "../../framework/view/AbstractComponent";

class AnswerList extends AbstractComponent {
    static propTypes = {
        answers: React.PropTypes.object.isRequired,
        locale: React.PropTypes.string.isRequired,
        isMultiSelect: React.PropTypes.bool.isRequired
    };

    constructor(props, context) {
        super(props, context);
        const viewModel = props.isMultiSelect ? new MultiSelectAnswerListModel(AppState.questionnaireAnswers.currentAnswer.value) : new SingleSelectAnswerListModel(AppState.questionnaireAnswers.currentAnswer.value);
        this.state = {answerListModel: viewModel};
        this.optionPressed = this.optionPressed.bind(this);
    }

    optionPressed(option) {
        var answersListModel = this.state.answerListModel;
        answersListModel.toggleSelection(option);
        AppState.questionnaireAnswers.currentAnswerValue = answersListModel.chosenAnswers;
        this.setState({answerListModel: answersListModel});
    }

    render() {
        const answers = this.props.answers.map((answer)=>answer.name);
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}).cloneWithRows(answers);
        return (
            <View style={{flex: 1}}>
                <ListView
                    enableEmptySections={true}
                    dataSource={ds}
                    renderRow={(answer)=><AnswerOption optionPressed={this.optionPressed} key={answer}
                                                       answer={answer}
                                                       isSelected={this.state.answerListModel.isSelected(answer)}
                    />}
                />
            </View>
        );
    }
}

export default AnswerList;