import React, {Component, View, Text} from 'react-native';
import AnswerOption from './AnswerOption';
import AppState from "../../hack/AppState";

class AnswerList extends Component {
    static propTypes = {
        answers: React.PropTypes.array.isRequired
    };

    toAnswerOption(answer, self) {
        console.log(self.constructor.name);
        return (<AnswerOption key={answer.name} answer={answer.name} answerList={self}/>);
    };

    onChange() {
        this.setState({});
    };

    render() {
        console.log(this.constructor.name);
        return (
            <View>
                {this.props.answers.map((option) => this.toAnswerOption(option, this))}
            </View>
        );
    }
}

export default AnswerList;