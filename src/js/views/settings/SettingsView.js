import React, {Component, View, TouchableHighlight, Text, Alert} from 'react-native';
import Path from '../../routing/Path';
import SettingsForm from './SettingsForm';
import SettingsHeader from './SettingsHeader';
import I18n from '../../utility/Messages';

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
    
    onDeleteSessionsPress = () => {
        const service = this.context.getService("decisionSupportSessionService");
        Alert.alert(
            'Do you want to delete all saved sessions?',
            `There are currently ${service.getNumberOfSessions()} sessions. Delete?`,
            [
                {text: 'Yes', onPress: () => {service.deleteAll()}},
                {text: 'No', onPress: () => {}, style: 'cancel'}
            ]
        )
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
                    <Text>{I18n.t("export")}</Text>
                </TouchableHighlight>
                <TouchableHighlight onPress={this.onDeleteSessionsPress}>
                    <Text>Delete Sessions</Text>
                </TouchableHighlight>
            </View>
        );
    }
}

export default SettingsView;