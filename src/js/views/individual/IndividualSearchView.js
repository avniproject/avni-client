import {View, StyleSheet, ScrollView, TextInput, Text} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import * as CHSStyles from "../primitives/GlobalStyles";
import Path from "../../framework/routing/Path";
import AppHeader from '../primitives/AppHeader';
import MessageService from "../../service/MessageService";

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    viewName() {
        return "IndividualSearchView";
    }

    render() {
        return (
            <View style={{flex: 1}} keyboardShouldPersistTaps={true}>
                <AppHeader title={this.I18n.t("individualSearch")} parent={this}/>
                <ScrollView style={[CHSStyles.Global.mainSection]} keyboardShouldPersistTaps={true}>
                    <View>
                        <Text>{this.I18n.t("name")}</Text>
                        <TextInput></TextInput>
                    </View>
                    <View>
                        <Text>{this.I18n.t("age")}</Text>
                        <TextInput keyboardType='numeric'></TextInput>
                    </View>
                </ScrollView>
            </View>
        );
    }
}

export default IndividualSearchView;