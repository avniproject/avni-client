import React, {Component, View, Text, TextInput, StyleSheet, TouchableOpacity, DatePickerAndroid, TouchableHighlight} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import AnswerList from './AnswerList.js';
import ConclusionView from "../conclusion/DecisionView";
import AppState from "../../hack/AppState"
import * as CHSStyles from "../primitives/GlobalStyles"
import AppHeader from '../primitives/AppHeader';
import WizardButtons from '../primitives/WizardButtons';
import General from '../../utility/General';

@Path('/QuestionAnswerView')
class QuestionAnswerView extends Component {
    static styles = StyleSheet.create({
        textinput: {
            borderRadius: 5,
            padding: 5,
            borderColor: '#000000',
            borderStyle: 'solid',
            borderWidth: 2,
            fontSize: 24
        },
        main: {
            flex: 1,
            flexDirection: 'column'
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

    toAnswer(questionAnswer) {
        if (questionAnswer.questionDataType === 'Numeric')
            return (
                <TextInput onChangeText={(text) => AppState.questionnaireAnswers.currentAnswer = text}
                           style={QuestionAnswerView.styles.textinput}
                           keyboardType='numeric'/>);
        else if (questionAnswer.questionDataType === 'Date')
            return (<TouchableHighlight
                onPress={this.showPicker.bind(this, 'simple', {date: AppState.questionnaireAnswers.currentAnswer})}>
                <Text>{this.dateDisplay()}</Text>
            </TouchableHighlight>);
        else
            return (<AnswerList locale={this.locale} answers={this.questionAnswer.answers}/>);
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

    render() {
        this.questionnaire.setQuestionIndex(this.props.params.questionNumber);
        this.questionAnswer = this.questionnaire.currentQuestion();
        AppState.questionnaireAnswers.currentQuestion = this.questionAnswer.question;
        return (
            <View>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName} parent={this}/>
                <View style={[CHSStyles.Global.mainSection, QuestionAnswerView.styles.main]}>
                    <Question question={this.questionAnswer.question}
                              questionConcept={this.questionAnswer.questionConcept}
                              locale={this.locale}/>
                    {this.toAnswer(this.questionAnswer)}
                </View>
                <WizardButtons hasQuestionBefore={!this.questionAnswer.isFirstQuestion}
                               nextParams={{
                                    questionNumber: this.props.params.questionNumber + 1
                               }}
                               parent={this}
                               nextView={this.questionAnswer.isLastQuestion ? ConclusionView : QuestionAnswerView}
                />
            </View>
        );
    }
}

export default QuestionAnswerView;