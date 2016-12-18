import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import React, {Component} from 'react';
import AppHeader from '../primitives/AppHeader';
import DecisionSupportSessionComponent from './DecisionSupportSessionComponent';
import Path from "../../framework/routing/Path";
import {GlobalStyles} from "../primitives/GlobalStyles";
import _ from 'lodash';
import General from '../../utility/General';
import MessageService from "../../service/MessageService";

@Path('/DecisionSupportSessionView')
class DecisionSupportSessionView extends Component {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    viewName() {
        return "DecisionSupportSessionView";
    }

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    render() {
        const session = this.props.params.session;
        const questionAnswers = session.questionAnswers.map((questionAnswer) => _.merge({}, {
            key: questionAnswer.question,
            value: questionAnswer.answerAsString(this.I18n)
        }));

        return (
            <View style={{flex: 1}}>
                <AppHeader parent={this}
                           title={this.I18n.t("session", {questionnaireName: this.I18n.t(session.questionnaire.name)})}/>
                <Text>{this.I18n.t("savedOn", {saveDate: General.formatDate(session.saveDate)})}</Text>
                <ScrollView style={GlobalStyles.mainSection}>
                    <DecisionSupportSessionComponent questionAnswers={questionAnswers} decisions={session.decisions}/>
                </ScrollView>
            </View>
        );
    }
}

export default DecisionSupportSessionView;