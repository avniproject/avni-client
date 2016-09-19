import {View, ListView, Text, StyleSheet, TouchableOpacity, TouchableHighlight, ScrollView} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";
import * as CHSStyles from "../primitives/GlobalStyles";
import AppHeader from '../primitives/AppHeader';
import Path from "../../framework/routing/Path";
import AppState from '../../hack/AppState';
import MessageService from '../../service/MessageService';
import DecisionSupportSessionService from '../../service/DecisionSupportSessionService';
import DecisionSupportSessionComponent from './DecisionSupportSessionComponent';
import QuestionnaireListView from "../questionnaireList/QuestionnaireListView";

@Path('/ConfirmationView')
class ConfirmationView extends Component {

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    onSaveAndRestart = () => {
        const decisionSupportSessionService = this.context.getService(DecisionSupportSessionService);
        decisionSupportSessionService.save(AppState.questionnaireAnswers, this.props.params.decisions);
        TypedTransition.from(this).resetTo(QuestionnaireListView);
    };

    onPrevious = () => {
        TypedTransition.from(this).goBack();
    };

    viewName() {
        return "ConfirmationView";
    }

    render() {
        return (
            <ScrollView keyboardShouldPersistTaps={true}>
                <AppHeader title={this.I18n.t("confirmation")}
                           parent={this}
                />
                <View style={CHSStyles.Global.mainSection}>
                    <DecisionSupportSessionComponent
                        questionnaire={this.props.params.questionnaire}
                        decisions={this.props.params.decisions}
                        questionAnswers={AppState.questionnaireAnswers.toArray()}/>
                </View>
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 30,
                        paddingRight: 10,
                        paddingLeft: 10
                    }}>
                    <TouchableHighlight>
                        <View style={CHSStyles.Global.actionButtonWrapper}>
                            <Text onPress={this.onPrevious}
                                  style={[CHSStyles.Global.actionButton, CHSStyles.Global.navButtonVisible]}>{this.I18n.t("previous")}</Text>
                        </View>
                    </TouchableHighlight>
                    <TouchableHighlight>
                        <View style={CHSStyles.Global.actionButtonWrapper}>
                            <Text onPress={this.onSaveAndRestart}
                                  style={[CHSStyles.Global.actionButton, CHSStyles.Global.navButtonVisible]}>{this.I18n.t("saveAndRestart")}</Text>
                        </View>
                    </TouchableHighlight>
                </View>
            </ScrollView>
        );
    }
}

export default ConfirmationView;