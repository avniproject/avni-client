import {StyleSheet, Text, View} from 'react-native';
import React, {Component} from 'react';
import I18n from '../../utility/Messages';
import SimpleQuestionnaire from '../../models/SimpleQuestionnaire';

class Question extends Component {
    static propTypes = {
        question: React.PropTypes.object.isRequired
    };

    static styles = StyleSheet.create({
        question: {
            fontSize: 22,
            height: 30,
            color: '#0C59CF'
        }
    });

    render() {
        return (
            <View>
                <Text style={Question.styles.question}>
                    {this.toQuestionText()}
                </Text>
            </View>
        );
    }

    toQuestionText() {
        const questionText = I18n.t(this.props.question.name);
        var text = this.props.question.isMandatory ? `${questionText} *` : `${questionText}`;
        if (this.props.question.questionDataType === SimpleQuestionnaire.Numeric && this.props.question.lowAbsolute !== undefined)
            text += ` [${this.props.question.lowAbsolute} - ${this.props.question.hiAbsolute}]`;
        return text;
    }
}

export default Question;