import {TextInput, View} from "react-native";
import React from "react";
import {Text} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../form/ValidationErrorMessage";

class NumericFormElement extends AbstractFormElement {
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
        const rangeText = this.rangeText();
        return (
            <View>
                <View style={{backgroundColor: '#ffffff', borderStyle: 'dashed'}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{rangeText!= null ? this.label + ` (${rangeText})` : this.label}</Text>
                </View>
                <View>
                    <TextInput style={{flex: 1}} underlineColorAndroid={this.borderColor}
                               value={_.toString(this.props.value.getValue())} onChangeText={(text) => this.onInputChange(text)}/>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>
    );
    }

    rangeText() {
        let rangeText = null;
        if (this.props.element.concept.lowNormal != null) {
            if (this.props.element.concept.hiNormal != null) {
                rangeText = `${this.props.element.concept.lowNormal} - ${this.props.element.concept.hiNormal}`;
            } else {
                rangeText = `>${this.props.element.concept.lowNormal}`
            }
        } else if (this.props.element.concept.hiNormal != null) {
            rangeText = `<${this.props.element.concept.hiNormal}`
        }
        return rangeText;
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: text});
    }
    }

    export default NumericFormElement;