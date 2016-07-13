import {View, Text} from 'react-native';
import React, {Component} from 'react';
import AnswerOption from './AnswerOption';

class AnswerList extends Component {
    static propTypes = {
        answers: React.PropTypes.array.isRequired,
        locale: React.PropTypes.string.isRequired
    };

    onChange() {
        this.setState({});
    };

    render() {
        return (
            <View>
                {this.props.answers.map((option) => (
                    <AnswerOption key={option.name} answer={option.name} answerList={this}/>))}
            </View>
        );
    }
}

export default AnswerList;