import React, { Component, View } from 'react-native';
import Path from '../../routing/path';
import initialSettings from '../../../config/initialSettings.json';
import SettingsForm from './SettingsForm';
import SettingsHeader from './SettingsHeader';

@Path('/settings')
export default class SettingsView extends Component {

  static contextTypes = {
    getStore: React.PropTypes.func.isRequired,
  };

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
    return (
      <View>
        <SettingsHeader/>
        <SettingsForm
          settings={this.getSettings()}
          onServerURLChanged={this.onServerURLChanged}
        />
      </View>
    );
  }
}
