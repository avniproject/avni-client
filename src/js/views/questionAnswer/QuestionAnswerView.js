import {
    View,
    ScrollView,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    DatePickerAndroid,
    TouchableHighlight
} from 'react-native';
import React, {Component} from 'react';
import Path from '../../framework/routing/Path';
import DecisionView from "../conclusion/DecisionView";
import AppState from "../../hack/AppState";
import AppHeader from '../primitives/AppHeader';
import TypedTransition from '../../framework/routing/TypedTransition'
import MessageService from '../../service/MessageService';
import QuestionAnswerControl from "./QuestionAnswerControl";

@Path('/QuestionAnswerView')
class QuestionAnswerView extends Component {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.questionnaire = this.props.params.questionnaire;
        this.I18n = context.getService(MessageService).getI18n();
        this.state = {};
    }

    viewName() {
        return "QuestionAnswerView";
    }

    render() {
        return (<View style={{flex: 1}} keyboardShouldPersistTaps={true}>
                <AppHeader title={this.I18n.t(AppState.questionnaireAnswers.questionnaireName)} parent={this}
                           onTitlePressed={this.onTitlePress}/>
                <QuestionAnswerControl
                    questionNumber={this.props.params.questionNumber}
                    questionnaire={this.props.params.questionnaire}
                    onNext={
                        (isLastQuestion) => {
                            TypedTransition.from(this).with({
                                questionNumber: this.props.params.questionNumber + 1,
                                questionnaire: this.props.params.questionnaire
                            }).to(isLastQuestion ? DecisionView : QuestionAnswerView);
                        }
                    }
                />
            </View>
        );
    }
}

export default QuestionAnswerView;