import {View, Text} from 'react-native';
import React, {Component} from 'react';
import AnswerOption from './AnswerOption';
import AppState from "../../hack/AppState";

class AnswerList extends Component {
    static propTypes = {
        answers: React.PropTypes.array.isRequired,
        isMultiSelect: React.PropTypes.array.isRequired,
        locale: React.PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {answersMap: new Map(props.answers.map((answer) => [answer.name, false]))};
        this.optionPressed = this.optionPressed.bind(this);
    }

    optionPressed(answer) {
        var answersMap = this.state.answersMap;
        const previousState = answersMap.get(answer);
        if (!this.props.isMultiSelect) {
            answersMap = new Map(this.props.answers.map((answerKey) => [answerKey.name, false]));
        }
        answersMap.set(answer, !previousState);
        AppState.questionnaireAnswers.currentAnswer = Array.from(answersMap.keys())
            .filter((answer) => answersMap.get(answer))
            .join();
        this.setState({answersMap: answersMap});
    }

    render() {
        return (
            <View>
                {this.props.answers.map((option) => (
                    <AnswerOption optionPressed={this.optionPressed} key={option.name} answer={option.name}
                                  isSelected={this.state.answersMap.get(option.name)}/>))}
            </View>
        );
    }
}

export default AnswerList;