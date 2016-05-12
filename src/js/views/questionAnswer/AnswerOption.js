import React, {Component, Text, StyleSheet} from 'react-native';

class AnswerOption extends Component {
    static propTypes = {
        answer: React.PropTypes.string.isRequired
        // match: React.PropTypes.func.isRequired,
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
    };

    static styles = StyleSheet.create({
        item: {
            backgroundColor: '#FF8A80',
            color: '#FFFFFF',
            margin: 10,
            width: 100,
            height: 100,
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
        },
    });

    render() {
        return (
            <Text onPress={this.props.match} style={AnswerOption.styles.item}>
                {this.props.answer}
            </Text>
        );
    }
}

export default AnswerOption;