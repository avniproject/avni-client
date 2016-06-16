import React, {Component, View} from 'react-native';
import Path from '../../routing/Path';
import initialSettings from '../../../config/initialSettings.json';
import SettingsForm from './SettingsForm';
import SettingsHeader from './SettingsHeader';

@Path('/settings')
class SettingsView extends Component {

    static contextTypes = {
        getStore: React.PropTypes.func.isRequired
    };

    getSettings = () => this.ensureCreated(this.context.getStore().objects('Settings'));

    ensureCreated = (settings) => {
        if (settings.length === 0) {
            const store = this.context.getStore();
            store.write(() => store.create('Settings', initialSettings));
        }
        return settings[0];
    };

    onValueChanged = (key, value) => {
        const view = this;
        this.context.getStore().write(()=> {
            view.getSettings()[key] = value;
        });
    };

    onServerURLChanged = (serverURL) => {
        this.onValueChanged("serverURL", serverURL);
    };

    onLocaleChanged = (locale) => {
        const view = this;
        this.context.getStore().write(()=> {
            view.getSettings()["locale"]["selectedLocale"] = locale;
        });
    };

    render() {
        var settings = this.getSettings();
        return (
            <View>
                <SettingsHeader/>
                <SettingsForm
                    settings={settings}
                    onServerURLChanged={this.onServerURLChanged}
                    onLocaleChanged={this.onLocaleChanged}
                />
            </View>
        );
    }
}

export default SettingsView;