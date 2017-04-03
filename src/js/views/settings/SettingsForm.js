import {StyleSheet, View, Alert} from "react-native";
import React, {Component} from "react";
import SettingsFormField from "./SettingsFormField";
import SettingsMultipleChoiceField from "./SettingsMultipleChoiceField";
import SettingsView from "./SettingsView";
import AbstractComponent from "../../framework/view/AbstractComponent";

class SettingsForm extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
    }

    static propTypes = {
        onServerURLChanged: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired,
        getService: React.PropTypes.func.isRequired,
    };

    render() {
        return (
            <View style={SettingsView.styles.form}>
                <SettingsFormField
                    formLabel={this.I18n.t("serverURL")}
                    onChangeText={this.props.onServerURLChanged}
                    defaultValue={this.props.settings.serverURL}
                />
                <SettingsFormField
                    formLabel={this.I18n.t("catchmentId")}
                    onChangeText={this.props.onCatchmentChanged}
                    defaultValue={`${this.props.settings.catchment}`}
                />
                <SettingsMultipleChoiceField
                    onChangeSelection={this.props.onLocaleChanged}
                    selectedValue={this.props.settings.locale.selectedLocale}
                    availableValues={this.props.settings.locale.availableValues}
                />
            </View>
        );
    }
}

export default SettingsForm;