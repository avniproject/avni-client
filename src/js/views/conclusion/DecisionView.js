import {View, Text, StyleSheet, ListView} from 'react-native';
import React, {Component} from 'react';
import Path from '../../framework/routing/Path';
import AppState from '../../hack/AppState'
import * as BMI_getDecision from '../../../config/decision/BMI'
import * as Sample_getDecision from '../../../config/decision/Sample'
import * as VHW_Lokbiradari_getDecision from '../../../config/decision/VHW_Lokbiradari'
import AppHeader from '../primitives/AppHeader';
import * as CHSStyles from "../primitives/GlobalStyles"
import WizardButtons from '../primitives/WizardButtons'
import ConfirmationView from "./ConfirmationView";
import I18n from '../../utility/Messages';
import DecisionSupportExtension from "../../models/DecisionSupportExtension";

@Path('/DecisionView')
class DecisionView extends Component {
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

    constructor(props, context) {
        super(props, context);
    }

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
            <View>
                <Text style={DecisionView.styles.summary}>{I18n.t(decision.name)}</Text>
                <Text style={DecisionView.styles.decision}>{decision.value}</Text>
                {this.renderAlert(decision)}
            </View>
        );
    }

    render() {
        const decisionSupportExtension = new DecisionSupportExtension(AppState.questionnaireAnswers.questionnaireName);
        console.log("Module name for making decision: " + decisionSupportExtension.functionName);
        const parameter = AppState.questionnaireAnswers;
        this.decisions = eval(`${decisionSupportExtension.functionName}.${decisionSupportExtension.functionName}(parameter)`);

        return (
            <View>
                <AppHeader title={AppState.questionnaireAnswers.questionnaireName}
                           onTitlePressed={this.onViewSavedSessionsPress}
                           parent={this}
                />
                <View style={CHSStyles.Global.mainSection}>
                    {this.renderDecisions(this.decisions)}
                    <WizardButtons hasQuestionBefore={true} nextParams={{decisions: this.decisions}} parent={this}
                                   nextView={ConfirmationView}/>
                </View>
            </View>
        );
    }
}

export default DecisionView;