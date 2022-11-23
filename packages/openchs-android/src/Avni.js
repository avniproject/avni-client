import React, {Component} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import Playground from "./Playground";
import Config from './framework/Config';
import Colors from "./views/primitives/Colors";

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
        if (Config.PLAYGROUND) {
            return <Playground/>;
        }

        const App = require('./App');
        return (
            <View style={Avni.styles.container}>
                <StatusBar backgroundColor={Colors.headerBackgroundColor} barStyle={'default'}/>
                <App/>
            </View>
        );
    }
}
