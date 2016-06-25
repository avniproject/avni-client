import React, {
    Component,
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    DatePickerAndroid,
    TouchableHighlight
} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import AnswerList from './AnswerList.js';
import DecisionView from "../conclusion/DecisionView";
import AppState from "../../hack/AppState"
import * as CHSStyles from "../primitives/GlobalStyles"
import AppHeader from '../primitives/AppHeader';
import WizardButtons from '../primitives/WizardButtons';
import General from '../../utility/General';
import SimpleQuestionnaire from '../../models/SimpleQuestionnaire';
import QuestionnaireAnswers from "../../models/QuestionnaireAnswers";

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
        this.questionnaire = context.getService("questionnaireService").getQuestionnaire(AppState.questionnaireAnswers.questionnaireName);
        this.locale = this.context.getStore().objects('Settings')[0]["locale"]["selectedLocale"];
        this.state = {};
    }

    renderAnswer(questionAnswer) {
        if (questionAnswer.questionDataType === SimpleQuestionnaire.Numeric || questionAnswer.questionDataType === SimpleQuestionnaire.Text)
            return (
                <TextInput onChangeText={(text) => AppState.questionnaireAnswers.currentAnswer = text}
                           style={QuestionAnswerView.styles.textInput}
                           keyboardType={questionAnswer.questionDataType === SimpleQuestionnaire.Numeric ? 'numeric' : 'default'}
                           autoFocus={true}/>);
        else if (questionAnswer.questionDataType === 'Date')
            return (<TouchableHighlight
                onPress={this.showPicker.bind(this, 'simple', {date: AppState.questionnaireAnswers.currentAnswer})}
                style={{margin: 10}}>
                <Text style={{fontSize: 24, fontWeight: 'bold'}}>{this.dateDisplay()}</Text>
            </TouchableHighlight>);
        else {
            return (<AnswerList locale={this.locale} answers={this.question.answers}/>);
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
            return {status: false, message: "There is no value specified"};
        } else if (this.question.isMandatory && this.question.questionDataType === SimpleQuestionnaire.Numeric &&
                    !isNaN(answer) && (answer < this.question.lowAbsolute || answer > this.question.hiAbsolute)) {
            return {status: false, message: "Is not a number of is out of range"};
        }
        return {status: true};
    };

    render() {
        this.questionnaire.setQuestionIndex(this.props.params.questionNumber);
        this.question = this.questionnaire.currentQuestion;
        AppState.questionnaireAnswers.currentQuestion = this.question.name;
        return (
            <View>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName} parent={this}/>
                <View style={[CHSStyles.Global.mainSection, {flex: 1}]}>
                    <Question question={this.question.name}
                              locale={this.locale}
                              isMandatory={this.question.isMandatory}/>
                    <View style={{flex: 1}}>
                        {this.renderAnswer(this.question)}
                    </View>
                    <WizardButtons hasQuestionBefore={!this.question.isFirstQuestion}
                                   nextParams={{
                                    questionNumber: this.props.params.questionNumber + 1
                               }}
                                   parent={this}
                                   nextView={this.question.isLastQuestion ? DecisionView : QuestionAnswerView}
                                   validationFn={this.validate}
                    />
                </View>
            </View>
        );
    }
}

export default QuestionAnswerView;