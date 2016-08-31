import {View, Text} from 'react-native';
import React, {Component} from 'react';
import AnswerOption from './AnswerOption';
import AppState from "../../hack/AppState";
import SingleSelectAnswerListModel from "../viewmodel/SingleSelectAnswerListModel";
import MultiSelectAnswerListModel from "../viewmodel/MultiSelectAnswerListModel";

class AnswerList extends Component {
    static propTypes = {
        answers: React.PropTypes.object.isRequired,
        locale: React.PropTypes.string.isRequired,
        isMultiSelect: React.PropTypes.bool.isRequired
    };

    constructor(props) {
        super(props);
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
        return (
            <View>
                {this.props.answers.map((option) => (
                    <AnswerOption optionPressed={this.optionPressed} key={option.name} answer={option.name}
                                  isSelected={this.state.answerListModel.isSelected(option.name)}
                    />))}
            </View>
        );
    }
}

export default AnswerList;