import React, {Component, Text, StyleSheet} from 'react-native';
import AppState from "../../hack/AppState";

class AnswerOption extends Component {
    static propTypes = {
        answer: React.PropTypes.string.isRequired
        // match: React.PropTypes.func.isRequired,
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        item: {
            backgroundColor: '#FF8A80',
            color: '#FFFFFF',
            margin: 10,
            width: 300,
            height: 30,
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
        }
    });

    onSelect = () => {
        AppState.conclusion.currentAnswer = this.props.answer;
    };

    render() {
        return (
            <Text onPress={this.onSelect} style={AnswerOption.styles.item}>
                {this.props.answer}
            </Text>
        );
    }
}

export default AnswerOption;