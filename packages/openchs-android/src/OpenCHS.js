import React, {Component} from 'react';
import {AppRegistry, StatusBar, StyleSheet, View} from 'react-native';
import App from "./App";
import Playground from "./Playground";
import Config from './framework/Config';
import Colors from "./views/primitives/Colors";

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
                <StatusBar backgroundColor={Colors.DefaultPrimaryColor}/>
                <App/>
            </View>
        );
        const renderPlayground = <Playground/>;
        return Config.PLAYGROUND ? renderPlayground : renderApp;
    }
}
