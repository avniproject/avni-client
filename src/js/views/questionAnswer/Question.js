import React, {Component, StyleSheet, Text, View} from 'react-native';
import I18n from '../../utility/Messages';

class Question extends Component {

    static propTypes = {
        question: React.PropTypes.string.isRequired,
        isMandatory: React.PropTypes.bool.isRequired
    };

    static styles = StyleSheet.create({
        question: {
            fontSize: 22,
            height: 30,
            color: '#0C59CF'
        }
    });

    render() {
        console.log(this.props.question);
        let question = I18n.t(this.props.question);
        return (
            <View>
                <Text style={Question.styles.question}>
                    {this.props.isMandatory ? `${question} *` : `${question}`}
                </Text>
            </View>
        );
    }
}

export default Question;