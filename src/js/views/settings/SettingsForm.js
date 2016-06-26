import React, {Component, StyleSheet, View} from 'react-native';
import SettingsFormField from './SettingsFormField';
import SettingsMultipleChoiceField from './SettingsMultipleChoiceField';

class SettingsForm extends Component {
    static propTypes = {
        onServerURLChanged: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired
    };

    static styles = StyleSheet.create({
        formItem: {
            marginBottom: 10
        },
        fieldLabel: {
            fontSize: 20,
            color: '#0C59CF'
        }
    });

    render() {
        return (
            <View style={{marginBottom: 10}}>
                <SettingsFormField
                    onChangeText={this.props.onServerURLChanged}
                    defaultValue={this.props.settings.serverURL}
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