import React, {Component, View, TouchableHighlight, Text} from 'react-native';
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
        this.service.save(locale);
        this.setState({});
    };

    onExportPress = () => {
        const service = this.context.getService("exportService");
        service.exportAll();
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
                <TouchableHighlight onPress={this.onExportPress}>
                    <Text>Export</Text>
                </TouchableHighlight>
            </View>
        );
    }
}

export default SettingsView;