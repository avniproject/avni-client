import React, { Component, Text } from 'react-native';

class AnswerOption extends Component {

    static propTypes = {
        next: React.PropTypes.func.isRequired,
        answer: React.PropTypes.object.isRequired,
    };

    render() {
        return (
            <Text key={this.props.answer.content} onPress={this.props.next}>
                {this.props.answer.content}
            </Text>
        );
    }
}

export default AnswerOption;