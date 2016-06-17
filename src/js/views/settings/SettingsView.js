import React, {Component, View} from 'react-native';
import Path from '../../routing/Path';
import SettingsForm from './SettingsForm';
import SettingsHeader from './SettingsHeader';

@Path('/settings')
class SettingsView extends Component {
    static contextTypes = {
        getStore: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.service = this.context.getService("settingsService");
        this.settings = this.service.getSettings();
    }

    onServerURLChanged = (serverURL) => {
        const view = this;
        this.service.save(()=> {
            view.settings.serverURL = serverURL;
        });
    };

    onLocaleChanged = (locale) => {
        const view = this;
        this.service.save(()=> {
            view.settings.locale.selectedLocale = locale;
        });
        this.setState({});
    };

    render() {
        return (
            <View>
                <SettingsHeader/>
                <SettingsForm
                    settings={this.settings}
                    onServerURLChanged={this.onServerURLChanged}
                    onLocaleChanged={this.onLocaleChanged}
                />
                <Text >Export</Text>
            </View>
        );
    }
}

export default SettingsView;