import React from 'react';
import {StyleSheet, TouchableNativeFeedback, View} from "react-native";
import {Icon} from "native-base";

export const IconContainer = ({onPress, name, type}) => {

    return (
        <TouchableNativeFeedback onPress={() => onPress()} background={TouchableNativeFeedback.SelectableBackground()}>
            <View style={styles.container}>
                <Icon style={styles.iconStyle} name={name} type={type}/>
            </View>
        </TouchableNativeFeedback>
    )
};
const styles = StyleSheet.create({
    container: {
        width: 24,
        height: 24,
        backgroundColor: '#29869A',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconStyle: {
        color: '#FFF',
        alignSelf: 'center',
        fontSize: 15
    }
});
