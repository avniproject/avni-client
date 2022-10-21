import PropTypes from 'prop-types';
import React, { Component } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { Checkbox as CheckBox } from 'native-base';
import Styles from "../../primitives/Styles";
import Colors from "../../primitives/Colors";

class CheckBoxFormElement extends Component {
    static propTypes = {
        label: PropTypes.string.isRequired,
        checkBoxText: PropTypes.string.isRequired,
        checked: PropTypes.bool.isRequired,
        onPress: PropTypes.func.isRequired
    };

    render() {
        const { label, checkBoxText, checked, onPress } = this.props;
        return (
            <View style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
                <Text style={Styles.formLabel}>{label}</Text>
                <CheckBox.Group accessibilityLabel={label}
                                onChange={onPress}>
                    <TouchableOpacity >
                        <View style={{ flex: 0.5, flexDirection: 'row', alignItems: 'center' }}>
                                <CheckBox value={checkBoxText} color={Colors.AccentColor}>
                                    <Text style={[Styles.formBodyText, {
                                        color: Colors.InputNormal
                                    }]}>
                                        {checkBoxText}
                                    </Text>
                                </CheckBox>
                        </View>
                    </TouchableOpacity>
                </CheckBox.Group>
            </View>
        );
    }
}

export default CheckBoxFormElement;
