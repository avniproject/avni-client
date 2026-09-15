import React from 'react';
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";

export const ApprovalButton = ({name, textColor, buttonColor, onPress, extraStyle}) => {
    return (
        <TouchableNativeFeedback onPress={onPress}
                                 background={TouchableNativeFeedback.SelectableBackground()}>
            <View style={[styles.buttonContainer, {backgroundColor: buttonColor}, extraStyle]}>
                <Text style={{color: textColor}}>{name}</Text>
            </View>
        </TouchableNativeFeedback>
    )
};

const styles = StyleSheet.create({
    buttonContainer: {
        elevation: 2,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        // Callers that fix a width - ApprovalDialog sets 90 - otherwise leave the label against the
        // left edge with the rest of the button an empty block of colour.
        alignItems: 'center',
        justifyContent: 'center',
    }
});
