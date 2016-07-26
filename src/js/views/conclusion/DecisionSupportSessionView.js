import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React, {Component} from 'react';
import AppHeader from '../primitives/AppHeader';
import DecisionSupportSessionComponent from './DecisionSupportSessionComponent';
import Path from "../../framework/routing/Path";

@Path('/DecisionSupportSessionView')
class DecisionSupportSessionView extends Component {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    render() {
        const session = this.props.params.session;
        return (
            <View style={CHSStyles.Global.mainSection}>
                <AppHeader parent={this} title="session"/>
                <DecisionSupportSessionComponent questionAnswers={session.questionAnswers} decisions={session.decisions}/>
            </View>
        );
    }
}

export default DecisionSupportSessionView;