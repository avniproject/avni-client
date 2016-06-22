import Path from '../../routing/Path';
import React, {Component, View, Text, StyleSheet, ListView} from 'react-native';
import General from '../../utility/General';
import AppHeader from '../primitives/AppHeader';
import I18n from '../../utility/Messages';

@Path('/ConclusionListView')
class ConclusionListView extends Component {
    static styles = StyleSheet.create({
        sessionItem: {
            fontSize: 18,
            flexDirection: 'column'
        },
        saveDate: {
            color: '#0C59CF'
        }
    });

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    renderSummaryField(summaryField, session) {
        return (
            <View style={{flex: 0.33}}>
                <Text style={[ConclusionListView.styles.sessionItem]}>{summaryField.getValueFrom(session)}</Text>
            </View>);
    }

    renderRow(session, questionnaire, rowID) {
        return (
            <View style={{flex: 1, flexDirection: 'row'}}>
                <View style={{flex: 0.33}}>
                    <Text
                          style={[ConclusionListView.styles.sessionItem, ConclusionListView.styles.saveDate]}>{General.formatDate(session.saveDate)}</Text>
                </View>
                {questionnaire.summaryFields.map((summaryField) => this.renderSummaryField(summaryField, session))}
            </View>);
    }

    renderSessions(questionnaireName) {
        const questionnaireService = this.context.getService("questionnaireService");
        var questionnaire = questionnaireService.getQuestionnaire(questionnaireName);

        const dssService = this.context.getService("decisionSupportSessionService");
        var sessions = dssService.getAll(questionnaireName);

        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(sessions);

        return (
            <View>
                <Text>{`Sessions for ${questionnaireName}`}</Text>
                <ListView
                    enableEmptySections={true}
                    dataSource={dsClone}
                    renderRow={(session, sectionID, rowID) => this.renderRow(session, questionnaire, rowID)}
                    renderHeader={() => <Text style={{fontSize: 24}}>{I18n.t("answersConfirmationTitle")}</Text>}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text key={rowID} style={{height: adjacentRowHighlighted ? 4 : 1,
                                                                                                     backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'}}></Text>}
                />
            </View>);
    }

    render() {
        const questionnaireService = this.context.getService("questionnaireService");
        const questionnaireNames = questionnaireService.getQuestionnaireNames();

        return (
            <View>
                <AppHeader title="allQuestionnaireSessionsSummary" parent={this}/>
                {questionnaireNames.map((questionnaireName) => this.renderSessions(questionnaireName))}
            </View>
        );
    }
}

export default ConclusionListView;