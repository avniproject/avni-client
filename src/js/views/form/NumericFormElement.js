import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, Row, InputGroup, Input} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";


class NumericFormElement extends AbstractComponent {
    static propTypes = {
        element: React.PropTypes.object.isRequired
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
                        <Input/>
                    </InputGroup>
                </Row>
            </View>);
    }
}

export default NumericFormElement;