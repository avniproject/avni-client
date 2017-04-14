import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button} from "native-base";
import Colors from "../primitives/Colors";
import Fonts from '../primitives/Fonts';

class ContextActionButton extends AbstractComponent {
    static propTypes = {
        labelKey: React.PropTypes.string.isRequired,
        onPress: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Button transparent textStyle={{fontSize: Fonts.Medium, color: Colors.ActionButtonColor}} onPress={() => this.props.onPress()}>{`${this.I18n.t(this.props.labelKey)}`}</Button>
        );
    }
}

export default ContextActionButton;