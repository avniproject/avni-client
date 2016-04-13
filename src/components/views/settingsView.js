import React, { Component, StyleSheet, Text, TextInput, View } from 'react-native';
import Path from '../routing/path';
import initialSettings from '../../config/initialSettings.json';
import { TypedStore } from '../../models';
import Settings from '../../models/Settings';

@Path('/settings', false)
export default class SettingsView extends Component {

  static contextTypes = {
    getStore: React.PropTypes.func.isRequired,
  };

  static styles = StyleSheet.create({
    header: {
      height: 100,
      width: 100,
      alignSelf: 'center',
      textAlign: 'center',
      color: '#333333',
      marginBottom: 5,
    },
    form: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
      marginLeft: 20,
      marginRight: 20,
    },
    input: {
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
    },
  });

  getSettings = () => this.ensureCreated(this.context.getStore().objects('Settings'));

  ensureCreated = (settings) => {
    if (settings.length === 0) {
      const store = this.context.getStore();
      store.write(() => store.create('Settings', initialSettings));
    }
    return settings[0];
  };

  onServerURLChanged = (serverURL) => {
    const view = this;
    this.context.getStore().write(() => {
      view.getSettings().serverURL = serverURL;
    });
  };

  render() {
    const settings = this.getSettings();
    return (
      <View>
        <Text style={SettingsView.styles.header}>
          Settings
        </Text>
        <View style={SettingsView.styles.form}>
          <Text>
            Server URL:
          </Text>
          <TextInput
            style={SettingsView.styles.input}
            onChangeText={this.onServerURLChanged}
            defaultValue={settings.serverURL}
          />
        </View>
      </View>
    );
  }
}
