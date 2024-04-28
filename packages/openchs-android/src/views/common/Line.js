import {StyleSheet, View} from 'react-native';
import React from 'react';
import Colors from '../primitives/Colors';

const Line = ({color = Colors.BlackBackground, height = 10}) => {
    return (
        <View style={{height: height}}>
            <View style={{borderColor: color, borderBottomWidth: StyleSheet.hairlineWidth}}/>
        </View>
    );
}

export default Line;
