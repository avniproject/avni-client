import React, {Component, View, Text, StyleSheet} from 'react-native';
import Path from '../../routing/Path';
import AppState from '../../hack/AppState'
import * as ConclusionFunctions from '../../../config/conclusions'
import AppHeader from '../primitives/AppHeader';
import * as CHSStyles from "../primitives/GlobalStyles"

@Path('/conclusion')
class ConclusionView extends Component {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        summary: {
            fontSize: 24,
            height: 30,
            color: '#0C59CF'
        },
        decision: {
            fontSize: 20,
            height: 26,
            color: '#0C59CF'
        },
        questionAnswer: {
            fontSize: 18,
            height: 24,
            color: '#0C59CF'
        }
    });

    constructor(props, context) {
        super(props, context);
    }

    renderQuestionAnswer(answer, question, questionAnswers) {
        return (
            <View>
                <Text style={ConclusionView.styles.questionAnswer}>{question}</Text>
                <Text style={ConclusionView.styles.questionAnswer}>{answer}</Text>
            </View>);
    }

    renderQuestionAnswers() {
        var questionAnswersDisplay = [];
        AppState.questionnaireAnswers.value.forEach((answer, question, questionAnswers) => questionAnswersDisplay.push(this.renderQuestionAnswer(answer, question, questionAnswers)));
        return questionAnswersDisplay;
    }

    render() {
        var conclusionFunctionName = AppState.questionnaireAnswers.questionnaireName.replace(/\s/g, "_") + "_conclusion";
        console.log("Function name for deriving conclusion: " + conclusionFunctionName);
        var parameter = AppState.questionnaireAnswers;
        var conclusion = eval(`ConclusionFunctions.${conclusionFunctionName}(parameter)`);
        return (
            <View>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName}/>
                <View style={CHSStyles.Global.mainSection}>
                    <Text style={ConclusionView.styles.summary}>{conclusion.systemDecisionSummary}</Text>
                    <Text style={ConclusionView.styles.decision}>{conclusion.systemDecision}</Text>
                    {this.renderQuestionAnswers()}
                </View>
            </View>
        );
    }
}

export default ConclusionView;