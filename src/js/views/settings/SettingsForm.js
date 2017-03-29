import {StyleSheet, View, Alert} from "react-native";
import React, {Component} from "react";
import SettingsFormField from "./SettingsFormField";
import SettingsMultipleChoiceField from "./SettingsMultipleChoiceField";
import SettingsView from "./SettingsView";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Actions from "../../action/index";

class SettingsForm extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
        this._triggerSync = this._triggerSync.bind(this);
        this.showError = this.showError.bind(this);
    }

    _triggerSync() {
        this.setState({syncing: true});
        this.dispatchAction(Actions.GET_CONFIG, {
            cb: ()=> this.setState({syncing: false}),
            errorHandler: (message)=> {
                this.setState({error: true, errorMessage: `${message}`, syncing: false})
            }
        });
    }

    static propTypes = {
        onServerURLChanged: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired,
        getService: React.PropTypes.func.isRequired,
    };

    render() {
        return (
            <View style={SettingsView.styles.form}>
                {this.showError("syncError")}
                <SettingsFormField
                    formLabel={this.I18n.t("serverURL")}
                    onChangeText={this.props.onServerURLChanged}
                    defaultValue={this.props.settings.serverURL}
                />
                <SettingsFormField
                    formLabel={this.I18n.t("catchmentId")}
                    onChangeText={this.props.onCatchmentChanged}
                    defaultValue={this.props.settings.catchment}
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