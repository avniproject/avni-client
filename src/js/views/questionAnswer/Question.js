import React, {Component, StyleSheet, Text, View} from 'react-native';

class Question extends Component {

    static propTypes = {
        question: React.PropTypes.string.isRequired,
    };

    static styles = StyleSheet.create({
        header: {
            height: 100,
            width: 100,
            alignSelf: 'center',
            textAlign: 'center',
            color: '#333333',
            marginBottom: 5,
        },
    });

    render() {
        return (
            <View>
                <Text style={Question.styles.header}>
                    {this.props.question}
                </Text>
            </View>
        );
    }
}

export default Question;