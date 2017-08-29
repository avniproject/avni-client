/* @flow */
import {AppRegistry, StyleSheet, View} from 'react-native';
import React, {Component} from 'react';
import App from "./src/App";

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
        return (
            <View style={OpenCHS.styles.container}>
                <App />
            </View>
        );
    }
}
console.ignoredYellowBox = ['Warning: You are manually calling'];
AppRegistry.registerComponent('OpenCHS', () => OpenCHS);
