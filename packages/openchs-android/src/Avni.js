import React, {Component} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import Colors from "./views/primitives/Colors";
import { LogBox } from 'react-native';
import General from "./utility/General";
import Config from './framework/Config';
import App from './App';
import ServerUrlConfiguration from './ServerUrlConfiguration';

export default class Avni extends Component {
    static styles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'stretch',
            backgroundColor: '#FFFFFF'
        }
    });

    render() {
        LogBox.ignoreAllLogs();
        General.logDebug("Avni", "=====================>>>>>>>Rendering main app component");
        return (
            <View style={Avni.styles.container}>
                <StatusBar backgroundColor={Colors.headerBackgroundColor} barStyle={'default'}/>
                {Config.allowServerURLConfig ? <ServerUrlConfiguration /> : <App />}
            </View>
        );
    }
}
