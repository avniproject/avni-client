import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import Path from '../../framework/routing/Path';
import SettingsForm from './SettingsForm';
import SettingsHeader from './SettingsHeader';
import FileSystemGateway from "../../service/gateway/FileSystemGateway";

@Path('/settings')
class SettingsView extends Component {
    static styles = StyleSheet.create({
        main: {
            marginLeft: 20,
            marginRight: 20
        }
    });

    static contextTypes = {
        getStore: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
        navigator: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.service = this.context.getService("settingsService");
        this.settings = this.service.getSettings();
        this.state = {exporting: false};
        this.onLocaleChanged = this.onLocaleChanged.bind(this);
    }

    onServerURLChanged = (serverURL) => {
        this.service.saveServerURL(serverURL);
    };

    onLocaleChanged = (locale) => {
        this.service.saveLocale(locale);
        this.setState({});
    };

    render() {
        return (
            <View style={[SettingsView.styles.main, {flexDirection: 'column'}]}>
                <SettingsHeader parent={this}/>
                <SettingsForm
                    settings={this.settings}
                    onServerURLChanged={this.onServerURLChanged}
                    onLocaleChanged={this.onLocaleChanged}
                />
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
                    <Text style={{flex: 0.2, fontSize: 20, color: '#0C59CF'}}>Home Folder</Text>
                    <Text style={{flex: 0.6, fontSize: 24, color: '#0C59CF'}}>{FileSystemGateway.basePath}</Text>
                </View>
                {this.renderBusyIndicator()}
            </View>
        );
    }

    renderBusyIndicator() {
        return this.state.exporting ? (<ProgressBarAndroid />) : (<View/>);
    }
}

export default SettingsView;