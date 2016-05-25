import React, {Component, Text, StyleSheet, TouchableHighlight} from 'react-native';
import AppState from "../../hack/AppState";

class AnswerOption extends Component {
    static propTypes = {
        answer: React.PropTypes.string.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        highlight: {
            
        },
        item: {
            backgroundColor: '#A8DADC',
            color: '#000000',
            margin: 10,
            height: 30,
            textAlign: 'left',
            textAlignVertical: 'center',
            justifyContent: 'center',
            fontSize: 16,
            marginLeft: 30
        }
    });

    onSelect = () => {
        AppState.questionnaireAnswers.currentAnswer = this.props.answer;
    };

    render() {
        return (
            <TouchableHighlight>
                <Text onPress={this.onSelect} style={AnswerOption.styles.item}>
                    {this.props.answer}
                </Text>
            </TouchableHighlight>
        );
    }
}

export default AnswerOption;