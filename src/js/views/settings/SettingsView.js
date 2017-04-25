import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import SettingsService from "../../service/SettingsService";
import {Content} from "native-base";
import GlobalStyles from "../primitives/GlobalStyles";
import _ from "lodash";
import SettingsFormField from "./SettingsFormField";
import SettingsMultipleChoiceField from "./SettingsMultipleChoiceField";

@Path('/settingsView')
class SettingsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.service = this.context.getService(SettingsService);
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

    onLogLevelChanged = (level) => {
        this.service.saveLogLevel(_.toNumber(level));
        this.setState({});
    };

    render() {
        this.settings = this.service.getSettings();
        return (
            <Content style={GlobalStyles.mainContent}>
                <View style={SettingsView.styles.form}>
                    <SettingsFormField
                        formLabel={this.I18n.t("serverURL")}
                        onChangeText={this.onServerURLChanged}
                        defaultValue={this.settings.serverURL}
                    />
                    <SettingsFormField
                        formLabel={this.I18n.t("catchmentId")}
                        onChangeText={this.onCatchmentChanged}
                        defaultValue={`${this.settings.catchment}`}
                    />
                    <SettingsMultipleChoiceField
                        onChangeSelection={this.onLocaleChanged}
                        selectedValue={this.settings.locale.selectedLocale}
                        availableValues={this.settings.locale.availableValues}
                    />
                    <SettingsFormField
                        formLabel={this.I18n.t("logLevel")}
                        onChangeText={this.onLogLevelChanged}
                        defaultValue={`${this.settings.logLevel}`}
                    />
                </View>
            </Content>
        );
    }
}

export default SettingsView;