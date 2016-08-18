import  {StyleSheet, Text, TouchableHighlight, View} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from '../../framework/routing/TypedTransition';
import QuestionAnswerView from './../questionAnswer/QuestionAnswerView';
import AppState from "../../hack/AppState";
import Colors from '../primitives/Colors';
import MessageService from '../../service/MessageService';
import QuestionnaireService from '../../service/QuestionnaireService';

class QuestionnaireButton extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static propTypes = {
        questionnaire: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        itemWrapper: {
            flex: 1,
            borderRadius: 5,
            backgroundColor: Colors.Primary,
            width: 50,
            height: 50,
            margin: 5
        },
        item: {
            color: '#FFFFFF',
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            fontSize: 23
        }
    });

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
                <View style={QuestionnaireButton.styles.itemWrapper}>
                    <Text onPress={this.onSelect} style={[QuestionnaireButton.styles.item, {flex: 1}]}>
                        {this.I18n.t(this.props.questionnaire.name)}
                    </Text>
                </View>
            </TouchableHighlight>
        );
    }
}

export default QuestionnaireButton;