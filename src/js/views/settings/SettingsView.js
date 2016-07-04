import {View, TouchableHighlight, Text, Alert, ProgressBarAndroid, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import Path from '../../routing/Path';
import SettingsForm from './SettingsForm';
import SettingsHeader from './SettingsHeader';
import I18n from '../../utility/Messages';
import TypedTransition from "../../routing/TypedTransition";
import {Global} from "../primitives/GlobalStyles";
import ConclusionListView from "../conclusion/ConclusionListView";
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
        this.onExportPress = this.onExportPress.bind(this);
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
        this.setState({exporting: true});
        const service = this.context.getService("exportService");
        service.exportAll(()=> this.setState({exporting: false}));
    };

    onDeleteSessionsPress = () => {
        const service = this.context.getService("decisionSupportSessionService");
        Alert.alert(
            I18n.t('deleteConfirmation'),
            I18n.t("numberOfSessions", {count: service.getNumberOfSessions()}),
            [
                {
                    text: 'Yes', onPress: () => {
                    service.deleteAll()
                }
                },
                {
                    text: 'No', onPress: () => {
                }, style: 'cancel'
                }
            ]
        )
    };

    onViewSavedSessionsPress = () => {
        TypedTransition.from(this).to(ConclusionListView);
    };

    render() {
        return (
            <View style={[SettingsView.styles.main, {flex: 1, flexDirection: 'column'}]}>
                <SettingsHeader/>
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
                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    <TouchableHighlight onPress={this.onViewSavedSessionsPress}>
                        <Text style={Global.actionButton}>{I18n.t("viewSavedSessions")}</Text>
                    </TouchableHighlight>
                    <TouchableHighlight onPress={this.onExportPress}>
                        <Text style={Global.actionButton}>{I18n.t("export")}</Text>
                    </TouchableHighlight>
                    <TouchableHighlight onPress={this.onDeleteSessionsPress}>
                        <Text style={Global.actionButton}>{I18n.t("deleteSessions")}</Text>
                    </TouchableHighlight>
                </View>
            </View>
        );
    }

    renderBusyIndicator() {
        return this.state.exporting ? (<ProgressBarAndroid />) : (<View/>);
    }
}

export default SettingsView;