import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, Row, InputGroup, Input} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import _ from 'lodash';

class NumericFormElement extends AbstractComponent {
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
            <View>
                <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.props.element.name}</Text>
                </Row>
                <Row>
                    <InputGroup style={{flex: 1}} borderType='underline'>
                        <Input keyboardType = 'numeric' value={_.isNil(this.props.value) ? "" : this.props.value.answer} onChangeText={(number) => this.onInputChange(number)} />
                    </InputGroup>
                </Row>
            </View>);
    }

    onInputChange(number) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: number});
    }
}

export default NumericFormElement;