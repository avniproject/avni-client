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
import PreviousNextSave from '../common/PreviousNextSave';
import General from '../../utility/General';
import SimpleQuestionnaire from '../../models/SimpleQuestionnaire';
import TypedTransition from '../../framework/routing/TypedTransition'
import MessageService from '../../service/MessageService';
import QuestionnaireListView from "../questionnaireList/QuestionnaireListView";
import DurationComponent from './DurationComponent';
import _ from 'lodash';
import AnswerList from './AnswerList';
import QuestionAnswerTabView from './../common/QuestionAnswerTabView';
import RuleEvaluationService from "../../service/RuleEvaluationService";

@Path('/QuestionAnswerView')
class QuestionAnswerView extends Component {
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

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        getDB: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.locale = this.context.getDB().objects('Settings')[0]["locale"]["selectedLocale"];
        this.questionnaire = this.props.params.questionnaire;
        this.I18n = context.getService(MessageService).getI18n();
        this.state = {};
    }

    viewName() {
        return "QuestionAnswerView";
    }

    renderAnswer(question) {
        if (question.questionDataType === SimpleQuestionnaire.Numeric || question.questionDataType === SimpleQuestionnaire.Text)
            return (
                <TextInput onChangeText={(text) => AppState.questionnaireAnswers.currentAnswerValue = text}
                           style={QuestionAnswerView.styles.textInput}
                           keyboardType={question.questionDataType === SimpleQuestionnaire.Numeric ? 'numeric' : 'default'}
                           autoFocus={true}>{AppState.questionnaireAnswers.currentAnswer.value}</TextInput>);
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
            console.log(validationResult);
            return {status: validationResult.passed, message: validationResult.message}
        }
        return {status: true};
    };

    onTitlePress = () => {
        TypedTransition.from(this).resetTo(QuestionnaireListView);
    };

    render() {
        this.question = this.questionnaire.getQuestion(this.props.params.questionNumber);
        AppState.questionnaireAnswers.currentQuestion = this.question.name;
        if (_.isNil(AppState.questionnaireAnswers.currentAnswer.value))
            AppState.questionnaireAnswers.currentAnswerValue = this.question.defaultValue;
        return (
            <View style={{flex: 1}} keyboardShouldPersistTaps={true}>
                <AppHeader title={this.I18n.t(AppState.questionnaireAnswers.questionnaireName)} parent={this}
                           onTitlePressed={this.onTitlePress}/>
                <ScrollView style={[CHSStyles.Global.mainSection]} keyboardShouldPersistTaps={true}>
                    <Question question={this.question} locale={this.locale}/>
                    <View style={{flex: 1}}>
                        {this.renderAnswer(this.question)}
                    </View>
                    <PreviousNextSave hasQuestionBefore={!this.question.isFirstQuestion}
                                      nextParams={{
                                          questionNumber: this.props.params.questionNumber + 1,
                                          questionnaire: this.props.params.questionnaire
                                      }}
                                      parent={this}
                                      nextView={this.question.isLastQuestion ? DecisionView : QuestionAnswerView}
                                      validationFn={this.validate}
                    />
                    <QuestionAnswerTabView questionnaire={this.props.params.questionnaire}
                                           data={AppState.questionnaireAnswers.toArray()}
                                           message={"answersConfirmationTitle"}/>
                </ScrollView>
            </View>
        );
    }
}

export default QuestionAnswerView;