import  {StyleSheet, Text, TouchableHighlight, View} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from '../../framework/routing/TypedTransition';
import QuestionAnswerView from './../questionAnswer/QuestionAnswerView';
import AppState from "../../hack/AppState";
import MessageService from '../../service/MessageService';
import QuestionnaireService from '../../service/QuestionnaireService';

class QuestionnaireButton extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static propTypes = {
        questionnaire: React.PropTypes.object.isRequired,
        styles: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    onSelect = () => {
        const service = this.context.getService(QuestionnaireService);
        const questionnaire = service.getQuestionnaire(this.props.questionnaire.uuid);
        AppState.startQuestionnaireSession(questionnaire);
        TypedTransition
            .from(this)
            .with({
                questionNumber: 0,
                questionnaire: questionnaire
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