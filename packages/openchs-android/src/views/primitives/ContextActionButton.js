import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Styles from "./Styles";
import Pressable from "react-native/Libraries/Components/Pressable/Pressable";

class ContextActionButton extends AbstractComponent {
    static propTypes = {
        labelKey: PropTypes.string.isRequired,
        onPress: PropTypes.func.isRequired,
        textColor: PropTypes.string.isOptional,
        key: PropTypes.string.isOptional
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const color = this.props.textColor || Colors.ActionButtonColor;
        return (
            <Pressable onPress={() => this.props.onPress()} style={{paddingHorizontal: 10}}
                       android_ripple={{borderless: false, radius: 20, color}}>
                <Text style={{
                    fontSize: Fonts.Medium,
                    color: color,
                    paddingHorizontal: 5,
                    backgroundColor: Styles.greyBackground,
                    borderRadius: 5
                }}>{`${this.I18n.t(this.props.labelKey)}`}</Text></Pressable>
        );
    }
}

export default ContextActionButton;
