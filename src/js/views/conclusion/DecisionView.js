import {View, Text, StyleSheet, ListView, ScrollView} from 'react-native';
import React, {Component} from 'react';
import Path from '../../framework/routing/Path';
import AppState from '../../hack/AppState'
import AppHeader from '../primitives/AppHeader';
import * as CHSStyles from "../primitives/GlobalStyles"
import WizardButtons from '../primitives/WizardButtons'
import ConfirmationView from "./ConfirmationView";
import MessageService from '../../service/MessageService';
import TabularListView from './TabularListView';
import RuleEvaluationService from "../../service/RuleEvaluationService";

@Path('/DecisionView')
class DecisionView extends Component {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    viewName() {
        return "DecisionView";
    }

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
        }
    });

    renderAlert(decision) {
        if (decision.alert !== undefined) {
            return (<Text style={{fontSize: 26, marginTop: 10, color: '#ff0000'}}>{decision.alert}</Text>);
        }
    }

    renderDecisions(decisions) {
        return decisions.map((decision) => {
            return this.renderDecision(decision);
        });
    }

    renderDecision(decision) {
        return (
            <View key={decision.name}>
                <Text style={DecisionView.styles.summary}>{this.I18n.t(decision.name)}</Text>
                <Text style={DecisionView.styles.decision}>{decision.value}</Text>
                {this.renderAlert(decision)}
            </View>
        );
    }

    render() {
        this.decisions = this.context.getService(RuleEvaluationService).getDecision(AppState.questionnaireAnswers.questionnaireName);
        return (
            <ScrollView keyboardShouldPersistTaps={true}>
                <AppHeader title={this.I18n.t(AppState.questionnaireAnswers.questionnaireName)}
                           onTitlePressed={this.onViewSavedSessionsPress}
                           parent={this}
                />
                <View style={CHSStyles.Global.mainSection}>
                    {this.renderDecisions(this.decisions)}
                    <WizardButtons hasQuestionBefore={true} nextParams={{decisions: this.decisions}} parent={this}
                                   nextView={ConfirmationView}/>
                </View>
                <TabularListView data={AppState.questionnaireAnswers.toArray()}
                                 message={"answersConfirmationTitle"}/>
            </ScrollView>
        );
    }
}

export default DecisionView;