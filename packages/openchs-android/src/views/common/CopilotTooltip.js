import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {useCopilot} from "react-native-copilot";
import Colors from "../primitives/Colors";

const CopilotTooltip = () => {
    const {stop, currentStep} = useCopilot();

    return (
        <View style={styles.tooltipBubble}>
            <Text style={styles.tooltipText}>{currentStep?.text}</Text>
            <TouchableOpacity style={styles.okButton} onPress={() => stop()}>
                <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    tooltipBubble: {
        backgroundColor: Colors.cardBackgroundColor,
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: 'center',
    },
    tooltipText: {
        fontSize: 15,
        color: Colors.DefaultPrimaryColor,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
    },
    okButton: {
        backgroundColor: Colors.ActionButtonColor,
        borderRadius: 5,
        paddingHorizontal: 30,
        paddingVertical: 8,
        elevation: 2,
    },
    okButtonText: {
        color: Colors.TextOnPrimaryColor,
        fontSize: 15,
        fontWeight: 'bold',
    },
});

export default CopilotTooltip;
