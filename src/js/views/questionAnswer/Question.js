import React, {Component, StyleSheet, Text, View} from 'react-native';

class Question extends Component {

    static propTypes = {
        question: React.PropTypes.string.isRequired,
        questionConcept: React.PropTypes.object.isRequired
    };

    static styles = StyleSheet.create({
        question: {
            fontSize: 22,
            height: 30,
            color: '#0C59CF'
        }
    });

    render() {
        console.log(this.props.questionConcept.conceptNames);
        console.log(this.props.locale);
        let question = this.props.questionConcept.conceptNames.filter((name) => name.locale === this.props.locale)[0];
        return (
            <View>
                <Text style={Question.styles.question}>
                    {question.name}
                </Text>
            </View>
        );
    }
}

export default Question;