import  {StyleSheet, Text, TouchableHighlight, View} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from '../../framework/routing/TypedTransition';
import QuestionAnswerView from './../questionAnswer/QuestionAnswerView';
import AppState from "../../hack/AppState";
import MessageService from '../../service/MessageService';
import QuestionnaireService from '../../service/QuestionnaireService';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Actions from '../../action';

class QuestionnaireButton extends AbstractComponent {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
        this.onSelect = this.onSelect.bind(this);
    }

    static propTypes = {
        questionnaire: React.PropTypes.object.isRequired,
        styles: React.PropTypes.object.isRequired
    };

    onSelect() {
        this.dispatchAction(Actions.CREATE_SESSION, {questionnaireUUID: this.props.questionnaire.uuid});
        TypedTransition
            .from(this)
            .with({
                questionnaireUUID: this.props.questionnaire.uuid
            })
            .to(QuestionAnswerView);
    };

    render() {
        return (
            <TouchableHighlight>
                <View style={this.props.styles.questionnaireButtonWrapper}>
                    <Text onPress={this.onSelect} style={this.props.styles.questionnaireButton}>
                        {this.I18n.t(this.props.questionnaire.name)}
                    </Text>
                </View>
            </TouchableHighlight>
        );
    }
}

export default QuestionnaireButton;