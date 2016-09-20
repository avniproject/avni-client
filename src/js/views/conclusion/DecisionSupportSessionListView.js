import Path from '../../framework/routing/Path';
import {View, Text, StyleSheet, ListView, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import General from '../../utility/General';
import AppHeader from '../primitives/AppHeader';
import MessageService from '../../service/MessageService';
import QuestionnaireService from '../../service/QuestionnaireService';
import DecisionSupportSessionService from '../../service/DecisionSupportSessionService';
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionView from "./DecisionSupportSessionView";
import * as CHSStyles from '../primitives/GlobalStyles';

@Path('/DecisionSupportSessionListView')
class DecisionSupportSessionListView extends Component {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    viewName() {
        return "DecisionSupportSessionListView";
    }

    onSessionRowPress(session) {
        TypedTransition.from(this).with({session: session}).to(DecisionSupportSessionView);
    };

    static renderSummaryField(summaryField, session, questionnaire, rowID) {
        return (
            <View style={CHSStyles.Global.listCellContainer}
                  key={`1.1${questionnaire.name}${summaryField.summaryFieldName}${rowID}`}>
                <Text key={`1.2${questionnaire.name}${rowID}`}
                      style={CHSStyles.Global.listCell}>{summaryField.getValueFrom(session)}</Text>
            </View>);
    }

    static renderSummaryFieldHeader(summaryField) {
        return (
            <View key={summaryField.summaryFieldName} style={CHSStyles.Global.listCellContainer}>
                <Text style={CHSStyles.Global.columnHeader}>{summaryField.summaryFieldName}</Text>
            </View>);
    }

    renderRow(session, questionnaire, rowID) {
        const rowIDSuffix = `${questionnaire.name}${rowID}`;
        return (
            <View key={`1${rowIDSuffix}`}>
                <TouchableHighlight onPress={() => this.onSessionRowPress(session)} key={`2${rowIDSuffix}`}>
                    <View style={CHSStyles.Global.listRow} key={`3${rowIDSuffix}`}>
                        <Text
                            style={CHSStyles.Global.listCell}
                            key={`4${rowIDSuffix}`}>{General.formatDate(session.saveDate)}</Text>
                        {questionnaire.summaryFields.map((summaryField) => DecisionSupportSessionListView.renderSummaryField(summaryField, session, questionnaire, rowID))}
                    </View>
                </TouchableHighlight>
            </View>);
    }

    renderSessions(questionnaire) {
        const questionnaireService = this.context.getService(QuestionnaireService);
        const completeQuestionnaire = questionnaireService.getQuestionnaire(questionnaire.uuid);

        const dssService = this.context.getService(DecisionSupportSessionService);
        var sessions = dssService.getAll(questionnaire.uuid);

        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(sessions);

        return (
            <View key={questionnaire.uuid} style={CHSStyles.Global.listViewContainer}>
                <ListView
                    enableEmptySections={true}
                    dataSource={dsClone}
                    renderRow={(session, sectionID, rowID) => this.renderRow(session, completeQuestionnaire, rowID)}
                    renderHeader={() => {
                        return (
                            <View>
                                <View>
                                    <Text style={CHSStyles.Global.listViewHeader}>
                                        {this.I18n.t(questionnaire.name)}
                                    </Text>
                                </View>
                                {sessions.length !== 0 ? this.renderColumnHeaders(completeQuestionnaire) : <View/>}
                            </View>
                        )
                    }}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => DecisionSupportSessionListView._renderSeparator(rowID, `S${questionnaire.name}${rowID}`, sessions.length)}
                />
                {this.renderZeroSessionMessageIfNeeded(sessions)}
            </View>);
    }

    static _renderSeparator(rowNumber, rowID, total) {
        if (rowNumber === (total - 1) || rowNumber === `${(total - 1)}` || total === 0 || total === undefined) return (
            <View key={rowID}/>);
        return (<Text key={rowID} style={CHSStyles.Global.listRowSeparator}/>);
    }

    renderZeroSessionMessageIfNeeded(sessions) {
        if (sessions.length === 0)
            return (
                <View>
                    <Text
                        style={CHSStyles.Global.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfSessions')}</Text>
                    {DecisionSupportSessionListView._renderSeparator(0)}
                </View>
            );
        else
            return (<View/>);
    }

    renderColumnHeaders(completeQuestionnaire) {
        return (<View>
            <View style={CHSStyles.Global.listRow}>
                <Text style={CHSStyles.Global.columnHeader}>{this.I18n.t('date')}</Text>
                {completeQuestionnaire.summaryFields.map((summaryField) => DecisionSupportSessionListView.renderSummaryFieldHeader(summaryField))}
            </View>
            <Text style={CHSStyles.Global.listRowSeparator}/>
        </View>);
    }

    render() {
        const questionnaireService = this.context.getService(QuestionnaireService);
        const questionnaires = questionnaireService.getQuestionnaireNames();
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}).cloneWithRows(questionnaires);
        return (
            <View style={{flex: 1}}>
                <AppHeader title={this.I18n.t("allQuestionnaireSessionsSummary")} parent={this}/>
                <View style={CHSStyles.Global.mainSection}>
                    <ListView
                        enableEmptySections={true}
                        dataSource={ds}
                        renderRow={this.renderSessions.bind(this)}
                    />
                </View>
            </View>
        );
    }
}

export default DecisionSupportSessionListView;