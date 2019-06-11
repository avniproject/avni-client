import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button, Text} from "native-base";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";

class ContextActionButton extends AbstractComponent {
    static propTypes = {
        labelKey: PropTypes.string.isRequired,
        onPress: PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const color = this.props.textColor || Colors.ActionButtonColor;
        return (
            <Button transparent onPress={() => this.props.onPress()}><Text style={{
                fontSize: Fonts.Medium,
                color: color,
                paddingHorizontal: 5
            }}>{`${this.I18n.t(this.props.labelKey)}`}</Text></Button>
        );
    }
}

export default ContextActionButton;
