import React, {Component, View, Text} from 'react-native';
import AnswerOption from './AnswerOption';

class AnswerList extends Component {
    static propTypes = {
        answers: React.PropTypes.array.isRequired,
        locale: React.PropTypes.string.isRequired
    };

    toAnswerOption(answer, self) {
        let conceptName = answer.conceptNames.filter((name) => name.locale === self.props.locale)[0];
        return (<AnswerOption key={conceptName.name} answer={conceptName.name} answerList={self}/>);
    };

    onChange() {
        this.setState({});
    };

    render() {
        return (
            <View>
                {this.props.answers.map((option) => this.toAnswerOption(option, this))}
            </View>
        );
    }
}

export default AnswerList;