import React, { Component, View } from 'react-native';
import AnswerOption from './AnswerOption';

class AnswerListView extends Component {

    static propTypes = {
        next: React.PropTypes.func.isRequired,
        answers: React.PropTypes.array.isRequired,
    };

    toAnswerOption = (answer) => (
        <AnswerOption key={answer.content} next={this.props.next(answer)} answer={answer}/>
    );

    render() {
        return (
            <View>
                {this.props.answers.map(this.toAnswerOption)}
            </View>
        );
    }
}

export default AnswerListView;