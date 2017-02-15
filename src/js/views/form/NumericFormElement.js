import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import {Text, Row, InputGroup, Input, Grid} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import _ from 'lodash';
import AbstractFormElement from "./AbstractFormElement";

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
            <Grid>
                <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10, borderStyle: 'dashed'}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                </Row>
                <Row>
                    <InputGroup style={{flex: 1}} borderType='underline'>
                        <Input onChangeText={(number) => this.onInputChange(_.toNumber(number))} value={_.toString(this.props.value.getValue())}/>
                    </InputGroup>
                </Row>
            </Grid>);
    }

    onInputChange(number) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: number});
    }
}

export default NumericFormElement;