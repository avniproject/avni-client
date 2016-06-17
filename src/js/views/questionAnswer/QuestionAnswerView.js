import React, {Component, View, Text, TextInput, StyleSheet, TouchableOpacity} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import AnswerList from './AnswerList.js';
import TypedTransition from '../../routing/TypedTransition';
import ConclusionView from "../conclusion/DecisionView";
import AppState from "../../hack/AppState"
import * as CHSStyles from "../primitives/GlobalStyles"
import AppHeader from '../primitives/AppHeader';
import WizardButtons from '../primitives/WizardButtons'

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
    }

    toAnswer(questionAnswer) {
        if (questionAnswer.questionDataType === 'Numeric')
            return (
                <TextInput onChangeText={(text) => AppState.questionnaireAnswers.currentAnswer = text}
                           style={QuestionAnswerView.styles.textinput}
                           keyboardType='numeric'/>);
        else
            return (<AnswerList locale={this.locale} answers={this.questionAnswer.answers}/>);
    };

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