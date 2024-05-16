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
        onPress: PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Pressable onPress={() => this.props.onPress()} style={{paddingHorizontal: 10}} android_ripple={{borderless: true, radius: 7, color: Colors.ActionButtonColor}}>
                <Text style={{
                    fontSize: Fonts.Medium,
                    color: Colors.ActionButtonColor,
                    paddingHorizontal: 5,
                    backgroundColor: Styles.greyBackground,
                    borderRadius: 5,
                    elevation: 2
                }}>{`${this.I18n.t(this.props.labelKey)}`}</Text></Pressable>
        );
    }
}

export default ContextActionButton;
