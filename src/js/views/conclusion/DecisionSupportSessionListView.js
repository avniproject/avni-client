import Path from "../../framework/routing/Path";
import {View, Text, StyleSheet, ListView, TouchableNativeFeedback} from "react-native";
import React, {Component} from "react";
import AppHeader from "../primitives/AppHeader";
import MessageService from "../../service/MessageService";
import QuestionnaireService from "../../service/QuestionnaireService";
import DecisionSupportSessionService from "../../service/DecisionSupportSessionService";
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionView from "./DecisionSupportSessionView";
import GlobalStyles from "../primitives/GlobalStyles";
import AbstractComponent from "../../framework/view/AbstractComponent";

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
        this.renderSummaryFieldHeader.bind(this);
    }

    viewName() {
        return "DecisionSupportSessionListView";
    }

    onSessionRowPress(session) {
        TypedTransition.from(this).with({session: session}).to(DecisionSupportSessionView);
    };

    static renderSummaryField(summaryField, session, questionnaire, rowID) {
        return (
            <View style={GlobalStyles.listCellContainer}
                  key={`1.1${questionnaire.name}${summaryField.summaryFieldName}${rowID}`}>
                <Text key={`1.2${questionnaire.name}${rowID}`}
                      style={GlobalStyles.listCell}>{summaryField.getValueFrom(session)}</Text>
            </View>);
    }

    renderSummaryFieldHeader(summaryField) {
        return (
            <View key={summaryField.summaryFieldName} style={GlobalStyles.listCellContainer}>
                <Text style={GlobalStyles.columnHeader}>{this.I18n.t(summaryField.summaryFieldName)}</Text>
            </View>);
    }

    renderRow(session, questionnaire, rowID) {
        const rowIDSuffix = `${questionnaire.name}${rowID}`;
        return (
            <View key={`1${rowIDSuffix}`}>
                <TouchableNativeFeedback onPress={() => this.onSessionRowPress(session)} key={`2${rowIDSuffix}`}>
                    <View style={GlobalStyles.listRow} key={`3${rowIDSuffix}`}>
                        {questionnaire.summaryFields.map((summaryField) => DecisionSupportSessionListView.renderSummaryField(summaryField, session, questionnaire, rowID))}
                    </View>
                </TouchableNativeFeedback>
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
            <View key={questionnaire.uuid} style={GlobalStyles.listViewContainer}>
                <ListView
                    enableEmptySections={true}
                    dataSource={dsClone}
                    renderRow={(session, sectionID, rowID) => this.renderRow(session, completeQuestionnaire, rowID)}
                    renderHeader={() => {
                        return (
                            <View>
                                <View>
                                    <Text style={GlobalStyles.listViewHeader}>
                                        {this.I18n.t(questionnaire.name)}
                                    </Text>
                                </View>
                                {sessions.length !== 0 ? this.renderColumnHeaders(completeQuestionnaire) : <View/>}
                            </View>
                        )
                    }}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => AbstractComponent._renderSeparator(rowID, `S${questionnaire.name}${rowID}`, sessions.length)}
                />
                {this.renderZeroSessionMessageIfNeeded(questionnaire, sessions)}
            </View>);
    }

    renderZeroSessionMessageIfNeeded(questionnaire, sessions) {
        if (sessions.length === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfSessions')}</Text>
                </View>
            );
        else
            return (<View/>);
    }

    renderColumnHeaders(completeQuestionnaire) {
        return (<View>
            <View style={GlobalStyles.listRow}>
                {completeQuestionnaire.summaryFields.map((summaryField) => this.renderSummaryFieldHeader(summaryField))}
            </View>
            <Text style={GlobalStyles.listRowSeparator}/>
        </View>);
    }

    render() {
        const questionnaireService = this.context.getService(QuestionnaireService);
        const questionnaires = questionnaireService.getQuestionnaireNames();
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2}).cloneWithRows(questionnaires);
        return (
            <View style={{flex: 1}}>
                <AppHeader title={this.I18n.t("allQuestionnaireSessionsSummary")} parent={this}/>
                <View style={GlobalStyles.mainSection}>
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