import React, {Component, View, Text, StyleSheet, ListView} from 'react-native';
import Path from '../../routing/Path';
import AppState from '../../hack/AppState'
import * as ConclusionFunctions from '../../../config/conclusions'
import AppHeader from '../primitives/AppHeader';
import ConclusionListView from '../conclusion/ConclusionListView';
import * as CHSStyles from "../primitives/GlobalStyles"
import TypedTransition from '../../routing/TypedTransition';
import DecisionSupportSessionService from '../../service/DecisionSupportSessionService'

@Path('/ConclusionView')
class ConclusionView extends Component {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        summary: {
            fontSize: 24,
            color: '#0C59CF'
        },
        decision: {
            fontSize: 20,
            color: '#0C59CF'
        },
        questionAnswer: {
            fontSize: 18,
            flexDirection: 'column'
        },
        question: {
            color: '#0C59CF',
        },
        answer: {}
    });

    constructor(props, context) {
        super(props, context);
    }

    renderQuestionAnswer(answer, question, questionAnswers) {
        return (
            <View style={{flex: 1, flexDirection: 'row'}}>
                <View style={{flex: 0.5}}>
                    <Text
                        style={[ConclusionView.styles.questionAnswer, ConclusionView.styles.question]}>{question}</Text>
                </View>
                <View style={{flex: 0.5}}>
                    <Text style={[ConclusionView.styles.questionAnswer, ConclusionView.styles.answer]}>{answer}</Text>
                </View>
            </View>);
    }

    onRestart = () => {
        TypedTransition.from(this).toBeginning();
    };

    onSaveAndRestart = () => {
        var service = this.context.getService("decisionSupportSessionService");
        service.save(AppState.questionnaireAnswers, this.conclusion);
        TypedTransition.from(this).toBeginning();
    };

    onQuestionnaireNamePress = () => {
        TypedTransition.from(this).with({
            questionnaireName: AppState.questionnaireAnswers.questionnaireName
        }).to(ConclusionListView);
    };

    render() {
        var conclusionFunctionName = AppState.questionnaireAnswers.questionnaireName.replace(/\s/g, "_") + "_conclusion";
        console.log("Function name for deriving conclusion: " + conclusionFunctionName);
        var parameter = AppState.questionnaireAnswers;
        this.conclusion = eval(`ConclusionFunctions.${conclusionFunctionName}(parameter)`);

        var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        var dsClone = ds.cloneWithRows(AppState.questionnaireAnswers.toArray());

        return (
            <View>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName} onTitlePressed={this.onQuestionnaireNamePress} />
                <View style={CHSStyles.Global.mainSection}>
                    <Text style={ConclusionView.styles.summary}>{this.conclusion.systemDecisionSummary}</Text>
                    <Text style={ConclusionView.styles.decision}>{this.conclusion.systemDecision}</Text>

                    <Text style={{fontSize: 24}}></Text>

                    <ListView
                        dataSource={dsClone}
                        renderRow={(rowData) => this.renderQuestionAnswer(rowData.answer, rowData.question, null)}
                        renderHeader={() => <Text style={{fontSize: 24}}>You answered as follows</Text>}
                        renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text style={{height: adjacentRowHighlighted ? 4 : 1,
                                                                                                     backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'}}></Text>}
                    />
                    <View
                        style={{flexDirection: 'row', height: 100, width: 600, justifyContent: 'flex-end', marginTop: 30, paddingRight: 20}}>
                        <Text onPress={this.onRestart}
                              style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>Restart</Text>
                        <Text onPress={this.onSaveAndRestart}
                              style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>Save & Restart</Text>
                    </View>
                </View>
            </View>
        );
    }
}

export default ConclusionView;