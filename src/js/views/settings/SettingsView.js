import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import SettingsForm from "./SettingsForm";
import SettingsService from "../../service/SettingsService";
import {Content} from "native-base";
import GlobalStyles from "../primitives/GlobalStyles";
import _ from "lodash";

@Path('/settingsView')
class SettingsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.service = this.context.getService(SettingsService);
        this.settings = this.service.getSettings();
        this.state = {exporting: false};
        this.onLocaleChanged = this.onLocaleChanged.bind(this);
    }

    onServerURLChanged = (serverURL) => {
        this.service.saveServerURL(serverURL);
    };

    onLocaleChanged = (locale) => {
        this.service.saveLocale(locale);
        this.setState({});
    };

    onCatchmentChanged = (catchment) => {
        this.service.saveCatchment(_.toNumber(catchment));
        this.setState({});
    };

    render() {
        return (
            <Content style={GlobalStyles.mainContent}>
                <SettingsForm
                    settings={this.settings}
                    onServerURLChanged={this.onServerURLChanged}
                    onLocaleChanged={this.onLocaleChanged}
                    onCatchmentChanged={this.onCatchmentChanged}
                    getService={this.context.getService}
                />
            </Content>
        );
    }
}

export default SettingsView;