import Path from '../../framework/routing/Path';
import {View, Text, StyleSheet, ListView, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import General from '../../utility/General';
import AppHeader from '../primitives/AppHeader';
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionView from "./DecisionSupportSessionView";

@Path('/DecisionSupportSessionListView')
class DecisionSupportSessionListView extends Component {
    static styles = StyleSheet.create({
        sessionItem: {
            fontSize: 18,
            flexDirection: 'column'
        },
        saveDate: {
            color: 'blue'
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

    renderSummaryField(summaryField, session) {
        return (
            <View style={{flex: 0.33}}>
                <Text
                    style={[DecisionSupportSessionListView.styles.sessionItem]}>{summaryField.getValueFrom(session)}</Text>
            </View>);
    }

    renderRow(session, questionnaire, rowID) {
        return (
            <View style={{flex: 1, flexDirection: 'row'}}>
                <TouchableHighlight style={{flex: 0.33}}>
                    <Text
                        onPress={() => this.onSessionRowPress(session)}
                        style={[DecisionSupportSessionListView.styles.sessionItem, DecisionSupportSessionListView.styles.saveDate]}>{General.formatDate(session.saveDate)}</Text>
                </TouchableHighlight>
                {questionnaire.summaryFields.map((summaryField) => this.renderSummaryField(summaryField, session))}
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
            <View style={{margin: 4}}>
                <ListView
                    enableEmptySections={true}
                    dataSource={dsClone}
                    renderRow={(session, sectionID, rowID) => this.renderRow(session, completeQuestionnaire, rowID)}
                    renderHeader={() => {
                        return (
                            <View>
                                <Text style={{
                                    fontSize: 24,
                                    color: '#000000'
                                }}>{`${this.I18n.t('sessionsForPrefix')} ${questionnaire.name}`}</Text>
                                {this._renderSeparator(0)}
                            </View>
                        )
                    }}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => this._renderSeparator(rowID)}
                />
                {this.renderZeroSessionMessage(sessions)}
            </View>);
    }

    _renderSeparator(rowID) {
        return (<Text key={rowID} style={{height: 2, backgroundColor: '#CCCCCC'}}></Text>);
    }

    renderZeroSessionMessage(sessions) {
        if (sessions.length === 0)
            return (
                <View>
                    <Text style={{fontSize: 18}}>{this.I18n.t('zeroNumberOfSessions')}</Text>
                    {this._renderSeparator(0)}
                </View>
            );
        else
            return (<Text/>);
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