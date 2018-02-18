import React from "react"; import PropTypes from 'prop-types';
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button} from "native-base";
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
        return (
            <Button transparent textStyle={{fontSize: Fonts.Medium, color: Colors.ActionButtonColor, paddingHorizontal: 5}} onPress={() => this.props.onPress()}>{`${this.I18n.t(this.props.labelKey)}`}</Button>
        );
    }
}

export default ContextActionButton;