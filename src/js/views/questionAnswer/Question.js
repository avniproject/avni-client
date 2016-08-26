import {StyleSheet, Text, View} from 'react-native';
import React, {Component} from 'react';
import General from '../../utility/General';
import MessageService from '../../service/MessageService';

class Question extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
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
        if (this.props.question.hasRange())
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