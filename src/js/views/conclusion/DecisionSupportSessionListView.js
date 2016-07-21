import Path from '../../framework/routing/Path';
import {View, Text, StyleSheet, ListView, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import General from '../../utility/General';
import AppHeader from '../primitives/AppHeader';
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionView from "./DecisionSupportSessionView";
import Colors from '../primitives/Colors';

@Path('/DecisionSupportSessionListView')
class DecisionSupportSessionListView extends Component {
    static styles = StyleSheet.create({
        sessionTypeContainer: {
            margin: 8,
            marginTop: 22,
            borderWidth: 2,
            borderRadius: 3,
            borderColor: Colors.Primary
        },
        sessionTypeHeader: {
            fontSize: 20,
            backgroundColor: Colors.Primary,
            color: '#ffffff',
            textAlign: 'center'
        },
        session: {
            flex: 1,
            flexDirection: 'row',
            marginLeft: 5
        },
        sessionItemContainer: {
            flex: 0.33
        },
        sessionItem: {
            fontSize: 19,
            color: Colors.Complimentary,
            textAlign: 'center',
            flex: 0.33
        },
        sessionSeparator: {
            height: 2,
            backgroundColor: '#14e4d5'
        },
        noSessionText: {
            fontSize: 18,
            textAlign: 'center',
            color: Colors.Complimentary
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
        this.I18n = context.getService("messageService").getI18n();
    }

    onSessionRowPress(session) {
        TypedTransition.from(this).with({session: session}).to(DecisionSupportSessionView);
    };

    renderSummaryField(summaryField, session, questionnaire, rowID) {
        return (
            <View style={DecisionSupportSessionListView.styles.sessionItemContainer} key={`1.1${questionnaire.name}${summaryField.summaryFieldName}${rowID}`}>
                <Text key={`1.2${questionnaire.name}${rowID}`}
                    style={[DecisionSupportSessionListView.styles.sessionItem]}>{summaryField.getValueFrom(session)}</Text>
            </View>);
    }

    renderRow(session, questionnaire, rowID) {
        const rowIDSuffix = `${questionnaire.name}${rowID}`;
        return (
            <View key={`1${rowIDSuffix}`}>
                <TouchableHighlight onPress={() => this.onSessionRowPress(session)} key={`2${rowIDSuffix}`}>
                    <View style={DecisionSupportSessionListView.styles.session} key={`3${rowIDSuffix}`}>
                        <Text
                            style={DecisionSupportSessionListView.styles.sessionItem} key={`4${rowIDSuffix}`}>{General.formatDate(session.saveDate)}</Text>
                        {questionnaire.summaryFields.map((summaryField) => this.renderSummaryField(summaryField, session, questionnaire, rowID))}
                    </View>
                </TouchableHighlight>
            </View>);
    }

    renderSessions(questionnaire) {
        const questionnaireService = this.context.getService("questionnaireService");
        const completeQuestionnaire = questionnaireService.getQuestionnaire(questionnaire.uuid);

        const dssService = this.context.getService("decisionSupportSessionService");
        var sessions = dssService.getAll(questionnaire.name);

        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(sessions);

        return (
            <View style={DecisionSupportSessionListView.styles.sessionTypeContainer}>
                <ListView
                    enableEmptySections={true}
                    dataSource={dsClone}
                    renderRow={(session, sectionID, rowID) => this.renderRow(session, completeQuestionnaire, rowID)}
                    renderHeader={() => {
                        return (
                            <View>
                                <Text style={DecisionSupportSessionListView.styles.sessionTypeHeader}>
                                    {questionnaire.name}
                                </Text>
                            </View>
                        )
                    }}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => this._renderSeparator(rowID, `S${questionnaire.name}${rowID}`, sessions.length)}
                />
                {this.renderZeroSessionMessage(sessions)}
            </View>);
    }

    _renderSeparator(rowNumber, rowID, total) {
        if (rowNumber === (total - 1) || rowNumber === `${(total - 1)}` || total === 0 || total === undefined) return (<View key={rowID}/>);
        return (<Text key={rowID} style={DecisionSupportSessionListView.styles.sessionSeparator}></Text>);
    }

    renderZeroSessionMessage(sessions) {
        if (sessions.length === 0)
            return (
                <View>
                    <Text
                        style={DecisionSupportSessionListView.styles.noSessionText}>{this.I18n.t('zeroNumberOfSessions')}</Text>
                    {this._renderSeparator(0)}
                </View>
            );
        else
            return (<View/>);
    }

    render() {
        const questionnaireService = this.context.getService("questionnaireService");
        const questionnaires = questionnaireService.getQuestionnaireNames();

        return (
            <View>
                <AppHeader title="allQuestionnaireSessionsSummary" parent={this}/>
                {questionnaires.map(this.renderSessions.bind(this))}
            </View>
        );
    }
}

export default DecisionSupportSessionListView;