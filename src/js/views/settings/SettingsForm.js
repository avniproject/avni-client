import {StyleSheet, View} from 'react-native';
import React, {Component} from 'react';
import SettingsFormField from './SettingsFormField';
import SettingsMultipleChoiceField from './SettingsMultipleChoiceField';
import SettingsView from './SettingsView';
import SyncButton from './SyncButton';


class SettingsForm extends Component {
    static propTypes = {
        onServerURLChanged: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired,
        getService: React.PropTypes.func.isRequired,
    };

    render() {
        return (
            <View style={SettingsView.styles.form}>
                <SettingsFormField
                    onChangeText={this.props.onServerURLChanged}
                    defaultValue={this.props.settings.serverURL}
                />
                <SettingsMultipleChoiceField
                    onChangeSelection={this.props.onLocaleChanged}
                    selectedValue={this.props.settings.locale.selectedLocale}
                    availableValues={this.props.settings.locale.availableValues}
                />
                <SyncButton getService={this.props.getService}/>
            </View>
        );
    }
}

export default SettingsForm;