import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React, {Component} from 'react';
import AppHeader from '../primitives/AppHeader';
import DecisionSupportSessionComponent from './DecisionSupportSessionComponent';
import Path from "../../framework/routing/Path";
import * as CHSStyles from "../primitives/GlobalStyles";
import _ from 'lodash';

@Path('/DecisionSupportSessionView')
class DecisionSupportSessionView extends Component {
    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "DecisionSupportSessionView";
    }

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    render() {
        const session = this.props.params.session;
        const questionAnswers = session.questionAnswers.map((questionAnswer) => _.merge({}, {
            key: questionAnswer.question,
            value: questionAnswer.answerAsString()
        }));

        return (
            <View>
                <AppHeader parent={this} title="session"/>
                <View style={CHSStyles.Global.mainSection}>
                    <DecisionSupportSessionComponent questionAnswers={questionAnswers} decisions={session.decisions}/>
                </View>
            </View>
        );
    }
}

export default DecisionSupportSessionView;