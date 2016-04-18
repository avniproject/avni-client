import React, { Component, StyleSheet, Text } from 'react-native';

class QuestionHeader extends Component {

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
            <Text style={QuestionHeader.styles.header}>
                {this.props.question}
            </Text>
        );
    }
}

export default QuestionHeader;