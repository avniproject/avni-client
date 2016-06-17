import React, { Component, StyleSheet, Text, TextInput, View } from 'react-native';
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
            <View>
                <Text style={SettingsForm.styles.field}>
                    Server URL
                </Text>
                <TextInput
                    style={SettingsFormField.styles.input}
                    onChangeText={this.props.onChangeText}
                    defaultValue={this.props.defaultValue}
                    />
            </View>
        );
    }
}

export default SettingsFormField;