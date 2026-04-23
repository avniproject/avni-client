import React from "react";
import PropTypes from "prop-types";
import {StyleSheet, TouchableOpacity, View} from "react-native";
import {Text} from "native-base";
import Colors from "./Colors";

class AnyChip extends React.PureComponent {
    static propTypes = {
        label: PropTypes.string.isRequired,
        active: PropTypes.bool,
        onPress: PropTypes.func.isRequired,
    };

    static defaultProps = {
        active: false,
    };

    render() {
        const {label, active, onPress} = this.props;
        const chipStyle = active ? styles.active : styles.inactive;
        const textStyle = active ? styles.activeText : styles.inactiveText;
        return (
            <TouchableOpacity onPress={onPress} accessibilityLabel={label}>
                <View style={[styles.chip, chipStyle]}>
                    <Text style={textStyle}>{label}</Text>
                </View>
            </TouchableOpacity>
        );
    }
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
    },
    inactive: {
        backgroundColor: Colors.FilterButtonColor,
        borderColor: Colors.ActionButtonColor,
    },
    active: {
        backgroundColor: Colors.ActionButtonColor,
        borderColor: Colors.ActionButtonColor,
    },
    inactiveText: {
        color: Colors.ActionButtonColor,
        fontSize: 14,
        lineHeight: 18,
    },
    activeText: {
        color: Colors.TextOnPrimaryColor,
        fontSize: 14,
        lineHeight: 18,
    },
});

export default AnyChip;
