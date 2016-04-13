import React, { Component, StyleSheet, Text } from 'react-native';

export default class SettingsHeader extends Component {

  static styles = StyleSheet.create({
    header: {
      height: 100,
      width: 100,
      alignSelf: 'center',
      textAlign: 'center',
      color: '#333333',
      marginBottom: 5,
    },
  });

  render() {
    return (
      <Text style={SettingsHeader.styles.header}>
        Settings
      </Text>
    );
  }
}
