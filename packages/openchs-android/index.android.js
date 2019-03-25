/* @flow */
import {AppRegistry, StyleSheet, View} from 'react-native';
import React, {Component} from 'react';
import App from "./src/App";
import Playground from "./src/Playground";
import Config from 'react-native-config';

class OpenCHS extends Component {

    static styles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'stretch',
            backgroundColor: '#FFFFFF'
        }
    });


    render() {
        const renderApp = (
            <View style={OpenCHS.styles.container}>
                <App/>
            </View>
        );
        const renderPlayground = <Playground/>;
        return Config.PLAYGROUND ? renderPlayground : renderApp;
    }
}

console.ignoredYellowBox = ['Warning: You are manually calling'];
AppRegistry.registerComponent('OpenCHS', () => OpenCHS);
console.disableYellowBox = true;
