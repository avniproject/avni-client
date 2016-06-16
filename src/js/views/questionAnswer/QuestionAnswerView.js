import React, {Component, View, Text, TextInput, StyleSheet, TouchableOpacity} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import AnswerList from './AnswerList.js';
import TypedTransition from '../../routing/TypedTransition';
import ConclusionView from "../conclusion/ConclusionView";
import AppState from "../../hack/AppState"
import * as CHSStyles from "../primitives/GlobalStyles"
import AppHeader from '../primitives/AppHeader';

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

    previousButton(questionAnswer) {
        var dynamicStyle = questionAnswer.isFirstQuestion ? CHSStyles.Global.navButtonHidden : CHSStyles.Global.navButtonVisible;
        return (
            <Text onPress={this.onPrevious} style={[CHSStyles.Global.navButton, dynamicStyle]}>Previous</Text>);
    };

    onPrevious = () => {
        TypedTransition.from(this).goBack();
    };

    onNext = () => {
        var typedTransition = TypedTransition.from(this);
        if (this.questionAnswer.isLastQuestion) {
            typedTransition.to(ConclusionView);
        } else {
            typedTransition.with({
                questionNumber: this.props.params.questionNumber + 1
            }).to(QuestionAnswerView);
        }
    };

    render() {
        this.questionnaire.setQuestionIndex(this.props.params.questionNumber);
        this.questionAnswer = this.questionnaire.currentQuestion();
        AppState.questionnaireAnswers.currentQuestion = this.questionAnswer.question;
        return (
            <View>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName}/>
                <View style={[CHSStyles.Global.mainSection, QuestionAnswerView.styles.main]}>
                    <Question question={this.questionAnswer.question}
                              questionConcept={this.questionAnswer.questionConcept}
                              locale={this.locale}/>
                    {this.toAnswer(this.questionAnswer)}
                    <View>
                        <View
                            style={{flexDirection: 'row', height: 100, width: 600, justifyContent: 'space-between', marginTop: 30, paddingRight: 20}}>
                            {this.previousButton(this.questionAnswer)}
                            <Text onPress={this.onNext}
                                  style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>Next</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }
}

export default QuestionAnswerView;