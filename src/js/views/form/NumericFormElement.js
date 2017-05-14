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
        console.log(this.props.element.concept.unit);
        const unit = this.props.element.concept.unit;
        let labelText = this.label;
        if (unit != null){
            labelText = labelText + ` (${unit}) `;
        }
        if (rangeText!=null){
            labelText = labelText + ` (${rangeText}) `;
        }
        return (
            <View>
                <View style={{backgroundColor: '#ffffff', borderStyle: 'dashed'}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{labelText}</Text>
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

    renderTextRange() {
        const rangeText = this.rangeText();
        if (rangeText != null) {
            return (<Text style={{flex: 0.25}}>some text</Text>);
        }else{
            return null;
        }
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: text});
    }
    }

    export default NumericFormElement;