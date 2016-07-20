import {StyleSheet, Text, View} from 'react-native';
import React, {Component} from 'react';
import I18n from '../../utility/Messages';
import SimpleQuestionnaire from '../../models/SimpleQuestionnaire';
import General from '../../utility/General';

class Question extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService("messageService").getI18n();
    }

    static propTypes = {
        question: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        question: {
            fontSize: 22,
            height: 30,
            color: '#e93a2c'
        }
    });

    toQuestionText() {
        const questionText = this.I18n.t(this.props.question.name);
        var text = this.props.question.isMandatory ? `${questionText} *` : `${questionText}`;
        if (this.props.question.questionDataType === SimpleQuestionnaire.Numeric && this.props.question.lowAbsolute !== undefined)
            text += ` ${General.formatRange(this.props.question)}`;
        return text;
    }

    render() {
        return (
            <View>
                <Text style={Question.styles.question}>
                    {this.toQuestionText()}
                </Text>
            </View>
        );
    }

}

export default Question;