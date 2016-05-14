import React, {Component, View, Text} from 'react-native';
import AnswerOption from './AnswerOption';

class AnswerList extends Component {
    static propTypes = {
        answers: React.PropTypes.array.isRequired
    };

    toAnswerOption = function (answer) {
        return (<AnswerOption key={answer.name} answer={answer.name}/>);
    };

    render() {
        return (
            <View>
                {this.props.answers.map(this.toAnswerOption)}
            </View>
        );
    }
}

export default AnswerList;