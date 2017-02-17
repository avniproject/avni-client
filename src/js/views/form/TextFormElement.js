import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, Row, InputGroup, Input} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import _ from 'lodash';
import AbstractFormElement from "./AbstractFormElement";

class TextFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                </View>
                <View>
                    <InputGroup style={{flex: 1}} borderType='underline'>
                        <Input value={_.isNil(this.props.value) ? "" : this.props.value.answer} onChangeText={(number) => this.onInputChange(number)} />
                    </InputGroup>
                </View>
            </View>);
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: text});
    }
}

export default TextFormElement;