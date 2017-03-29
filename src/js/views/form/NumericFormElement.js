import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import {Text, Row, InputGroup, Input, Grid} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import _ from 'lodash';
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from '../form/ValidationErrorMessage';

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
        return (
            <View>
                <View style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10, borderStyle: 'dashed'}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                </View>
                <View>
                    <InputGroup style={{flex: 1, borderColor: _.isNil(this.props.validationResult) ? 'rgba(0, 0, 0, 0.12)' : '#d0011b'}} borderType='underline'>
                        <Input onChangeText={(text) => this.onInputChange(text)} value={_.toString(this.props.value.getValue())}/>
                    </InputGroup>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>);
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: text});
    }
}

export default NumericFormElement;