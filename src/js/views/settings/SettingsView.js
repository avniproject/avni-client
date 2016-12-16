import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import SettingsForm from "./SettingsForm";
import SettingsService from "../../service/SettingsService";
import {Content} from "native-base";

@Path('/settings')
class SettingsView extends AbstractComponent {
    static styles = StyleSheet.create({
        mainContent: {marginHorizontal: 24},
        main: {
            flexDirection: 'column'
        },
        form: {
            marginTop: 40
        },
        formItem: {
            marginBottom: 10,
            marginHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'flex-end'
        },
        formItemLabel: {
            fontSize: 20,
            color: '#e93a2c',
            flex: 0.18
        },
        formItemInput: {
            height: 40,
            borderColor: '#e93a2c',
            borderWidth: 3,
            flex: 0.7
        }
    });

    static contextTypes = {
        getDB: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        navigator: React.PropTypes.func.isRequired
    };

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

    render() {
        return (
            <Content style={SettingsView.styles.mainContent}>
                <SettingsForm
                    settings={this.settings}
                    onServerURLChanged={this.onServerURLChanged}
                    onLocaleChanged={this.onLocaleChanged}
                    getService={this.context.getService}
                />
            </Content>
        );
    }
}

export default SettingsView;