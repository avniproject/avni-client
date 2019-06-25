import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button, Text} from "native-base";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import {TouchableOpacity} from 'react-native'

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
            <TouchableOpacity onPress={() => this.props.onPress()} style={{marginHorizontal: 8}}>
                <Text style={{
                    fontSize: Fonts.Medium,
                    fontWeight: 'bold',
                    color: color,
                    paddingHorizontal: 5
                }}>{`${this.I18n.t(this.props.labelKey)}`}</Text></TouchableOpacity>
        );
    }
}

export default ContextActionButton;
