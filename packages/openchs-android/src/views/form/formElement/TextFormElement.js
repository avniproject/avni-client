import {TextInput, View} from "react-native";
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Styles from "../../primitives/Styles";

class TextFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
                {this.label}
                <TextInput {...this.props} style={Styles.formBodyText} underlineColorAndroid={this.borderColor} secureTextEntry={this.props.secureTextEntry}
                           value={_.isNil(this.props.value) ? "" : this.props.value.answer} onChangeText={(text) => this.onInputChange(text)}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>);
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: text});
    }
}

export default TextFormElement;