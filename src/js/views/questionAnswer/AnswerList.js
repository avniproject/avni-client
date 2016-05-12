import React, { Component, View, Text } from 'react-native';
import AnswerOption from './AnswerOption';

class AnswerList extends Component {

    static propTypes = {
        // next: React.PropTypes.func.isRequired,
        answers: React.PropTypes.array.isRequired
    };

    toAnswerOption = function(answer) {
        // next={this.props.next(answer)}
        if (answer.datatype.name !== "Numeric")
            return (<AnswerOption key={answer.name} answer={answer.name}/>);
        else
            return (<Text>Foo</Text>);
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