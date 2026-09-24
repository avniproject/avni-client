import React from 'react';
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Colors from "../primitives/Colors";

export const ApprovalButton = ({name, textColor, buttonColor, onPress, extraStyle, disabled}) => {
    // Rendered without the touchable rather than with TouchableNativeFeedback's disabled prop: that leaves
    // the ripple wired up and the button still reads as pressable. Dropping the wrapper is what makes a
    // press impossible rather than merely ignored.
    if (disabled) {
        return (
            <View style={[styles.buttonContainer, {backgroundColor: Colors.DisabledButtonColor}, extraStyle]}>
                <Text style={{color: Colors.SecondaryText}}>{name}</Text>
            </View>
        )
    }
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
