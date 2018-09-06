import React, { Component } from "react";
import { View, TouchableOpacity } from "react-native";
import { Text, CheckBox } from 'native-base';
import Styles from "../../primitives/Styles";
import Colors from "../../primitives/Colors";
import themes from "../../primitives/themes";
import Distances from "../../primitives/Distances";

class CheckBoxFormElement extends Component {
    static propTypes = {
        label: React.PropTypes.string.isRequired,
        checkBoxText: React.PropTypes.string.isRequired,
        checked: React.PropTypes.bool.isRequired,
        onPress: React.PropTypes.func.isRequired
    };

    render() {
        const { label, checkBoxText, checked, onPress } = this.props;
        const container = {
            paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
            flex: 1
        };
        return (
            <View style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
                <Text style={Styles.formLabel}>{label}</Text>
                <TouchableOpacity style={container} onPress={onPress}>
                    <View style={container}>
                        <View style={{ flex: 0.9, flexDirection: 'row', alignItems: 'center' }}>
                            <CheckBox
                                theme={themes}
                                checked={checked}
                                onPress={onPress} />
                            <Text style={[Styles.formBodyText, { 
                                marginLeft: 11, 
                                color: Colors.InputNormal, 
                                flex: .95, 
                                color: Colors.InputNormal 
                            }]}>
                                {checkBoxText}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }
}

export default CheckBoxFormElement;