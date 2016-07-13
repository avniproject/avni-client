import {View, Text} from 'react-native';
import React, {Component} from 'react';
import AnswerOption from './AnswerOption';
import AppState from "../../hack/AppState";

class AnswerList extends Component {
    static propTypes = {
        answers: React.PropTypes.array.isRequired,
        locale: React.PropTypes.string.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {answersMap: this.genAnswerMap(props.answers)};
        this.optionPressed = this.optionPressed.bind(this);
    }

    genAnswerMap(answerList) {
        return new Map(answerList.map((answer) => [answer.name, false]))
    }

    joinSelection(answerMap) {
        return Array.from(answerMap.keys())
            .filter((answer) => answerMap.get(answer))
            .join();
    }

    optionPressed(answer) {

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