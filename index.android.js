/* @flow */
import {AppRegistry, StyleSheet, View} from 'react-native';
import React, {Component} from 'react';
import App from './src/js/App';

class OpenCHSClient extends Component {

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
            <View style={OpenCHSClient.styles.container}>
                <App />
            </View>
        );
    }
}
console.ignoredYellowBox = ['Warning: You are manually calling'];
AppRegistry.registerComponent('OpenCHSClient', () => OpenCHSClient);
