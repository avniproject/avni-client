import React, {Component, StyleSheet, Text, View} from 'react-native';

class Question extends Component {

    static propTypes = {
        question: React.PropTypes.string.isRequired
    };

    static styles = StyleSheet.create({
        question: {
            fontSize: 22,
            height: 100,
            width: 600,
            alignSelf: 'center',
            textAlign: 'center',
            color: '#333333',
            marginBottom: 5
        }
    });

    render() {
        return (
            <View>
                <Text style={Question.styles.question}>
                    {this.props.question}
                </Text>
            </View>
        );
    }
}

export default Question;