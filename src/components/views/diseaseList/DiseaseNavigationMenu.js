import React, { Component, StyleSheet, Text, View } from 'react-native';
import TypedTransition from '../../routing/TypedTransition';
import settingsView from './../settings/SettingsView';

export default class DiseaseNavigationMenu extends Component {

  static contextTypes = {
    navigator: React.PropTypes.func.isRequired,
  };

  static styles = StyleSheet.create({
    button: {
      textAlign: 'left',
    },
  });

  goToSettings = () => {
    TypedTransition.from(this).to(settingsView);
  };

  render() {
    return (
      <View>
        <Text style={DiseaseNavigationMenu.styles.button} onPress={this.goToSettings}>
          Settings
        </Text>
      </View>
    );
  }
}
