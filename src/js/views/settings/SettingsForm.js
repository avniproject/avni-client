import React, {Component, StyleSheet, View} from 'react-native';
import SettingsFormField from './SettingsFormField';
import SettingsMultipleChoiceField from './SettingsMultipleChoiceField';

class SettingsForm extends Component {

    static propTypes = {
        onServerURLChanged: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired
    };

    static styles = StyleSheet.create({
        form: {
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            marginLeft: 20,
            marginRight: 20
        },
        field: {
            fontSize: 20,
            color: '#0C59CF'
        }
    });

    render() {
        return (
            <View style={SettingsForm.styles.form}>
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