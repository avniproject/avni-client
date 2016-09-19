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
import Question from './Question.js';
import DecisionView from "../conclusion/DecisionView";
import AppState from "../../hack/AppState";
import * as CHSStyles from "../primitives/GlobalStyles"
import AppHeader from '../primitives/AppHeader';
import WizardButtons from '../primitives/WizardButtons';
import General from '../../utility/General';
import SimpleQuestionnaire from '../../models/SimpleQuestionnaire';
import TypedTransition from '../../framework/routing/TypedTransition'
import MessageService from '../../service/MessageService';
import SettingsService from '../../service/SettingsService';
import QuestionnaireListView from "../questionnaireList/QuestionnaireListView";
import DurationComponent from './DurationComponent';
import _ from 'lodash';
import AnswerList from './AnswerList';
import TabularListView from './../conclusion/TabularListView';
import AbstractComponent from '../../framework/view/AbstractComponent';

@Path('/QuestionAnswerView')
class QuestionAnswerView extends AbstractComponent {
    static styles = StyleSheet.create({
        textInput: {
            padding: 5,
            borderColor: '#000000',
            borderStyle: 'solid',
            borderWidth: 2,
            fontSize: 24
        }
    });

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.locale = context.getService(SettingsService).getLocale();
        this.I18n = context.getService(MessageService).getI18n();
        this.state = {
            loading: true,
            questionnaire: this.getState(this.props.params.questionnaireUUID).questionnaire
        };
        this.subscribe(this.handleChange);
    }

    handleChange() {

    }

    renderAnswer(question) {
        if (question.questionDataType === SimpleQuestionnaire.Numeric || question.questionDataType === SimpleQuestionnaire.Text)
            return (
                <TextInput onChangeText={(text) => AppState.questionnaireAnswers.currentAnswerValue = text}
                           style={QuestionAnswerView.styles.textInput}
                           keyboardType={question.questionDataType === SimpleQuestionnaire.Numeric ? 'numeric' : 'default'}
                           autoFocus={question.isMandatory ? true : false}>{AppState.questionnaireAnswers.currentAnswer.value}</TextInput>);
        else if (question.questionDataType === SimpleQuestionnaire.Duration) {
            return (
                <DurationComponent styles={QuestionAnswerView.styles}/>);
        }
        else if (question.questionDataType === SimpleQuestionnaire.Date)
            return (<TouchableHighlight
                onPress={this.showPicker.bind(this, 'simple', {date: AppState.questionnaireAnswers.currentAnswer.value})}
                style={{margin: 10}}>
                <Text style={{fontSize: 24, fontWeight: 'bold'}}>{this.dateDisplay()}</Text>
            </TouchableHighlight>);
        else {
            return (<AnswerList locale={this.locale} answers={this.question.answers}
                                isMultiSelect={this.question.isMultiSelect}/>);
        }
    };

    dateDisplay() {
        if (_.isNil(AppState.questionnaireAnswers.currentAnswer) || _.isNil(AppState.questionnaireAnswers.currentAnswer.value)) {
            return "Choose a date";
        } else {
            return General.formatDate(AppState.questionnaireAnswers.currentAnswer.value);
        }
    }

    async showPicker(stateKey, options) {
        try {
            var newState = {};
            const {action, year, month, day} = await DatePickerAndroid.open(options);
            if (action === DatePickerAndroid.dismissedAction) {
            } else {
                AppState.questionnaireAnswers.currentAnswerValue = new Date(year, month, day);
            }
            this.setState({});
        } catch ({code, message}) {
            console.warn(`Error in example '${stateKey}': `, message);
        }
    }

    validate() {
        const answer = AppState.questionnaireAnswers.currentAnswer;
        if (this.question.isMandatory && AppState.questionnaireAnswers.currentAnswerIsEmpty) {
            return {status: false, message: this.I18n.t('emptyValidationMessage')};
        } else if (this.question.questionDataType === SimpleQuestionnaire.Numeric && this.question.isRangeViolated(answer)) {
            return {
                status: false,
                message: this.I18n.t('numericValueValidation', {range: General.formatRange(this.question)})
            };
        }
        return {status: true};
    }

    onTitlePress() {
        TypedTransition.from(this).resetTo(QuestionnaireListView);
    }

    componentWillUnmount() {
        this.unsubscribe();
    }

    componentDidMount() {
        // console.log(this.context.getStore().getState());
    }

    render() {
        return (
            <ScrollView keyboardShouldPersistTaps={true}>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName} parent={this}
                           onTitlePressed={this.onTitlePress}/>
                <View style={[CHSStyles.Global.mainSection]}>
                    {this.renderComponent(this.state.loading, (
                        <View>
                            <Question question={this.question} locale={this.locale}/>
                            <View>
                                {this.renderAnswer(this.question)}
                            </View>
                        </View>), color = "black", size = "large")}
                    <WizardButtons hasQuestionBefore={!this.question.isFirstQuestion}
                                   nextParams={{
                                       questionNumber: this.props.params.questionNumber + 1,
                                       questionnaire: this.props.params.questionnaire
                                   }}
                                   parent={this}
                                   nextView={this.question.isLastQuestion ? DecisionView : QuestionAnswerView}
                                   validationFn={this.validate}/>
                    <TabularListView data={AppState.questionnaireAnswers.toArray()}
                                     message={"answersConfirmationTitle"}/>
                </View>
            </ScrollView>
        );
    }
}

export default QuestionAnswerView;