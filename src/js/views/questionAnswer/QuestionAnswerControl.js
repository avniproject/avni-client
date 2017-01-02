import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import TypedTransition from "../../framework/routing/TypedTransition";
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
import Question from './Question.js';
import AppState from "../../hack/AppState";
import GlobalStyles from "../primitives/GlobalStyles"
import PreviousNextSave from '../common/PreviousNextSave';
import General from '../../utility/General';
import SimpleQuestionnaire from '../../models/SimpleQuestionnaire';
import QuestionnaireListView from "../questionnaireList/QuestionnaireListView";
import DurationComponent from './DurationComponent';
import _ from 'lodash';
import AnswerList from './AnswerList';
import QuestionAnswerTabView from './../common/QuestionAnswerTabView';
import RuleEvaluationService from "../../service/RuleEvaluationService";

class QuestionAnswerControl extends AbstractComponent {
    static propTypes = {
        questionnaire: React.PropTypes.object.isRequired,
        questionNumber: React.PropTypes.number.isRequired,
        onNext: React.PropTypes.func.isRequired,
    };

    static styles = StyleSheet.create({
        textInput: {
            padding: 5,
            borderColor: '#000000',
            borderStyle: 'solid',
            borderWidth: 2,
            fontSize: 24
        }
    });

    constructor(props, context) {
        super(props, context);
    }

    renderAnswer(question) {
        if (question.questionDataType === SimpleQuestionnaire.Numeric || question.questionDataType === SimpleQuestionnaire.Text)
            return (
                <TextInput onChangeText={(text) => AppState.questionnaireAnswers.currentAnswerValue = text}
                           style={QuestionAnswerControl.styles.textInput}
                           keyboardType={question.questionDataType === SimpleQuestionnaire.Numeric ? 'numeric' : 'default'}
                           autoFocus={true}>{AppState.questionnaireAnswers.currentAnswer.value}</TextInput>);
        else if (question.questionDataType === SimpleQuestionnaire.Duration) {
            return (
                <DurationComponent styles={QuestionAnswerControl.styles}/>);
        }
        else if (question.questionDataType === SimpleQuestionnaire.Date)
            return (<TouchableHighlight
                onPress={this.showPicker.bind(this, 'simple', {date: AppState.questionnaireAnswers.currentAnswer.value})}
                style={{margin: 10}}>
                <Text style={{fontSize: 24, fontWeight: 'bold'}}>{this.dateDisplay()}</Text>
            </TouchableHighlight>);
        else {
            return (<AnswerList answers={this.question.answers.map((answer)=>answer.name)}
                                isMultiSelect={this.question.isMultiSelect} currentAnswers={AppState.questionnaireAnswers.currentAnswer.value}
                                answerHolder={AppState.questionnaireAnswers}/>);
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

    validate = () => {
        const answer = AppState.questionnaireAnswers.currentAnswer;
        if (this.question.isMandatory && AppState.questionnaireAnswers.currentAnswerIsEmpty) {
            return {status: false, message: this.I18n.t('emptyValidationMessage')};
        } else if (this.question.questionDataType === SimpleQuestionnaire.Numeric && this.question.isRangeViolated(answer)) {
            return {
                status: false,
                message: this.I18n.t('numericValueValidation', {range: General.formatRange(this.question)})
            };
        }

        if (this.question.isLastQuestion) {
            const validationResult = this.context.getService(RuleEvaluationService).validate(AppState.questionnaireAnswers.questionnaireName);
            return {status: validationResult.passed, message: validationResult.message}
        }
        return {status: true};
    };

    onTitlePress = () => {
        TypedTransition.from(this).resetTo(QuestionnaireListView);
    };

    render() {
        this.question = this.props.questionnaire.getQuestion(this.props.questionNumber);
        AppState.questionnaireAnswers.currentQuestion = this.question.name;
        if (_.isNil(AppState.questionnaireAnswers.currentAnswer.value))
            AppState.questionnaireAnswers.currentAnswerValue = this.question.defaultValue;
        return (
            <ScrollView style={[GlobalStyles.mainSection]} keyboardShouldPersistTaps={true}>
                <Question question={this.question}/>
                <View style={{flex: 1}}>
                    {this.renderAnswer(this.question)}
                </View>
                <PreviousNextSave hasQuestionBefore={!this.question.isFirstQuestion}
                                  onPrevious={() => {TypedTransition.from(this.props.parent).goBack()}}
                                  onNext={() => {this.props.onNext(this.question.isLastQuestion)}}
                                  validationFn={this.validate}
                />
                <View style={{marginTop: 40}}>
                    <QuestionAnswerTabView questionnaire={this.props.questionnaire}
                                           data={AppState.questionnaireAnswers.toArray()}
                                           message={"answersConfirmationTitle"}/>
                </View>
            </ScrollView>
        );
    }
}

export default QuestionAnswerControl;