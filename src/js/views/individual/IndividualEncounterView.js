import {View, StyleSheet, ScrollView} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import * as CHSStyles from "../primitives/GlobalStyles";
import AppHeader from "../primitives/AppHeader";

@Path('/IndividualEncounterView')
class IndividualEncounterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualEncounterView";
    }

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={{flex: 1}}>
                <AppHeader title={this.props.params.individual.name} parent={this}/>
                <ScrollView style={[CHSStyles.Global.mainSection]}>

                </ScrollView>
            </View>
        );
    }
}

export default IndividualEncounterView;