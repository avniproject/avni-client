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
import MultiSelectAnswerList from './MultiSelectAnswerList';
import SingleSelectAnswerList from './SingleSelectAnswerList';
import DecisionView from "../conclusion/DecisionView";
import AppState from "../../hack/AppState"
import * as CHSStyles from "../primitives/GlobalStyles"
import AppHeader from '../primitives/AppHeader';
import WizardButtons from '../primitives/WizardButtons';
import General from '../../utility/General';
import SimpleQuestionnaire from '../../models/SimpleQuestionnaire';
import QuestionnaireAnswers from "../../models/QuestionnaireAnswers";
import I18n from '../../utility/Messages';
import TypedTransition from '../../framework/routing/TypedTransition'
import DiseaseListView from "../diseaseList/DiseaseListView";

@Path('/QuestionAnswerView')
class QuestionAnswerView extends Component {
    static styles = StyleSheet.create({
        textInput: {
            borderRadius: 5,
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
        getStore: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.locale = this.context.getStore().objects('Settings')[0]["locale"]["selectedLocale"];
        this.questionnaire = this.props.params.questionnaire;
        this.state = {};
    }

    renderAnswer(questionAnswer) {
        if (questionAnswer.questionDataType === SimpleQuestionnaire.Numeric || questionAnswer.questionDataType === SimpleQuestionnaire.Text)
            return (
                <TextInput onChangeText={(text) => AppState.questionnaireAnswers.currentAnswer = text}
                           style={QuestionAnswerView.styles.textInput}
                           keyboardType={questionAnswer.questionDataType === SimpleQuestionnaire.Numeric ? 'numeric' : 'default'}
                           autoFocus={true}>{AppState.questionnaireAnswers.currentAnswer}</TextInput>);
        else if (questionAnswer.questionDataType === 'Date')
            return (<TouchableHighlight
                onPress={this.showPicker.bind(this, 'simple', {date: AppState.questionnaireAnswers.currentAnswer})}
                style={{margin: 10}}>
                <Text style={{fontSize: 24, fontWeight: 'bold'}}>{this.dateDisplay()}</Text>
            </TouchableHighlight>);
        else {
            var AnswerComponent = new Map([[true, MultiSelectAnswerList], [false, SingleSelectAnswerList]])
                .get(this.question.isMultiSelect);
            return (<AnswerComponent locale={this.locale} answers={this.question.answers}/>);
        }
    };

    dateDisplay() {
        if (AppState.questionnaireAnswers.currentAnswer === undefined) {
            return "Choose a date";
        } else {
            return General.formatDate(AppState.questionnaireAnswers.currentAnswer);
        }
    }

    async showPicker(stateKey, options) {
        try {
            var newState = {};
            const {action, year, month, day} = await DatePickerAndroid.open(options);
            if (action === DatePickerAndroid.dismissedAction) {
            } else {
                AppState.questionnaireAnswers.currentAnswer = new Date(year, month, day);
            }
            this.setState({});
        } catch ({code, message}) {
            console.warn(`Error in example '${stateKey}': `, message);
        }
    }

    validate = () => {
        const answer = AppState.questionnaireAnswers.currentAnswer;
        if (this.question.isMandatory && AppState.questionnaireAnswers.currentAnswerIsEmpty) {
            return {status: false, message: I18n.t('emptyValidationMessage')};
        } else if (this.question.isMandatory && this.question.questionDataType === SimpleQuestionnaire.Numeric &&
            General.isAnswerNotWithinRange(answer, this.question)) {
            return {
                status: false,
                message: I18n.t('numericValueValidation', {range: General.formatRange(this.question)})
            };
        }
        return {status: true};
    };

    onTitlePress = () => {
        TypedTransition.from(this).resetTo(DiseaseListView);
    };

    render() {
        this.question = this.questionnaire.getQuestion(this.props.params.questionNumber);
        AppState.questionnaireAnswers.currentQuestion = this.question.name;
        return (
            <ScrollView keyboardShouldPersistTaps={true}>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName} parent={this}
                           onTitlePressed={this.onTitlePress}/>
                <View style={[CHSStyles.Global.mainSection, {flex: 1}]}>
                    <Question question={this.question} locale={this.locale}/>
                    <View style={{flex: 1}}>
                        {this.renderAnswer(this.question)}
                    </View>
                    <WizardButtons hasQuestionBefore={!this.question.isFirstQuestion}
                                   nextParams={{
                                       questionNumber: this.props.params.questionNumber + 1,
                                       questionnaire: this.props.params.questionnaire
                                   }}
                                   parent={this}
                                   nextView={this.question.isLastQuestion ? DecisionView : QuestionAnswerView}
                                   validationFn={this.validate}
                    />
                </View>
            </ScrollView>
        );
    }
}

export default QuestionAnswerView;