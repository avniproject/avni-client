import {TextInput, View} from "react-native";
import React from "react";
import {Text} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../form/ValidationErrorMessage";

class TextFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object,
        validationResult: React.PropTypes.object,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={this.appendedStyle({flexDirection: 'column'})}>
                <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                <TextInput style={{marginVertical: 0, paddingVertical: 5}} underlineColorAndroid={this.borderColor}
                           value={_.isNil(this.props.value) ? "" : this.props.value.answer} onChangeText={(text) => this.onInputChange(text)}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>);
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: text});
    }
}

export default TextFormElement;