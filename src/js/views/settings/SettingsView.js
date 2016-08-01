import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import Path from '../../framework/routing/Path';
import SettingsForm from './SettingsForm';
import SettingsHeader from './SettingsHeader';

@Path('/settings')
class SettingsView extends Component {
    static styles = StyleSheet.create({
        main: {
            flexDirection: 'column'
        },
        form: {
            marginTop: 40
        },
        formItem: {
            marginBottom: 10,
            marginHorizontal: 10,
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-end'
        },
        formItemLabel: {
            fontSize: 20,
            color: '#e93a2c',
            flex: 0.18
        },
        formItemInput: {
            height: 40,
            borderColor: '#e93a2c',
            borderWidth: 3,
            flex: 0.7
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
            <View style={[SettingsView.styles.main]}>
                <SettingsHeader parent={this}/>
                <SettingsForm
                    settings={this.settings}
                    onServerURLChanged={this.onServerURLChanged}
                    onLocaleChanged={this.onLocaleChanged}
                    getService={this.context.getService}
                />
                {this.renderBusyIndicator()}
            </View>
        );
    }

    renderBusyIndicator() {
        return this.state.exporting ? (<ProgressBarAndroid />) : (<View/>);
    }
}

export default SettingsView;