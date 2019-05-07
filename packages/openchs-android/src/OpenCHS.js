import React, {Component} from 'react';
import {AppRegistry, StyleSheet, View} from 'react-native';
import App from "./App";
import Playground from "./Playground";
import Config from './framework/Config';

export default class OpenCHS extends Component {

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
        console.log(['OpenCHS'], JSON.stringify(Config));
        return Config.PLAYGROUND ? renderPlayground : renderApp;
    }
}
