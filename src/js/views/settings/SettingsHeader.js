import React, { Component, StyleSheet, Text } from 'react-native';

class SettingsHeader extends Component {
    static styles = StyleSheet.create({
        header: {
            height: 100,
            width: 100,
            alignSelf: 'center',
            textAlign: 'center',
            color: '#333333',
            marginBottom: 5,
            fontSize: 26
        }
    });

    render() {
        return (
            <Text style={SettingsHeader.styles.header}>
                Settings
            </Text>
        );
    }
}

export default SettingsHeader;