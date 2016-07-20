import  {StyleSheet, Text, TextInput, View} from 'react-native';
import React, {Component} from 'react';
import SettingsView from './SettingsView';

class SettingsFormField extends Component {
    static propTypes = {
        onChangeText: React.PropTypes.func.isRequired,
        defaultValue: React.PropTypes.string.isRequired
    };

    render() {
        return (
            <View style={SettingsView.styles.formItem}>
                <Text style={SettingsView.styles.formItemLabel}>Server URL</Text>
                <TextInput
                    style={[SettingsView.styles.formItemInput, {fontSize: 20}]}
                    onChangeText={this.props.onChangeText}
                    defaultValue={this.props.defaultValue}
                />
            </View>
        );
    }
}

export default SettingsFormField;