import AbstractComponent from "../../../framework/view/AbstractComponent";
import _ from 'lodash';
import Colors from '../../primitives/Colors';
import React from "react";
import {Text} from "native-base";
import Styles from "../../primitives/Styles";


class AbstractFormElement extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    get label() {
        const mandatoryText = this.props.element.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> :
            <Text></Text>;
        return <Text style={Styles.formLabel}>{this.I18n.t(this.props.element.name)}{mandatoryText}</Text>;
    }

    get hasNoValidationError() {
        return _.isNil(this.props.validationResult) || this.props.validationResult.success;
    }

    get borderColor() {
        return this.hasNoValidationError ? Colors.InputBorderNormal : Colors.ValidationError;
    }

    get textColor() {
        return this.hasNoValidationError ? Colors.InputNormal : Colors.ValidationError;
    }

    renderFormElement() {
        return (<View/>)
    }

    renderView() {
        return (<View/>);
    }

    render() {
        return this.showElement ? this.renderFormElement() : this.renderView();
    }
}

export default AbstractFormElement;