import React, {Component, StyleSheet, Text, View} from 'react-native';

class Question extends Component {

    static propTypes = {
        question: React.PropTypes.string.isRequired
    };

    static styles = StyleSheet.create({
        question: {
            fontSize: 22,
            height: 30,
            width: 600,
            marginLeft: 10,
            color: '#0C59CF'
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