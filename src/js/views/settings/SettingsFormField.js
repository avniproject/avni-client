import  {StyleSheet, Text, TextInput, View} from 'react-native';
import React, {Component} from 'react';
import SettingsForm from './SettingsForm';

class SettingsFormField extends Component {
    static propTypes = {
        onChangeText: React.PropTypes.func.isRequired,
        defaultValue: React.PropTypes.string.isRequired
    };

    static styles = StyleSheet.create({
        input: {
            height: 40,
            borderColor: 'gray',
            borderWidth: 1
        }
    });

    render() {
        return (
            <View style={[SettingsForm.styles.formItem, {flexDirection: 'row', alignItems: 'center'}]}>
                <Text style={[SettingsForm.styles.fieldLabel, {flex: 0.2}]}>
                    Server URL
                </Text>
                <TextInput
                    style={[SettingsFormField.styles.input, {flex: 0.6}]}
                    onChangeText={this.props.onChangeText}
                    defaultValue={this.props.defaultValue}
                />
            </View>
        );
    }
}

export default SettingsFormField;