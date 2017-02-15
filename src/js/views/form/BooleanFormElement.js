import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {Text, Grid, Col, Row, Radio} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import AbstractFormElement from "./AbstractFormElement";

class BooleanFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        observationValue: React.PropTypes.object.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(answer) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: answer});
    }

    renderSingleSelectAnswers() {
        const value = this.props.observationValue.getValue();
        return (<Grid style={{padding: 28, backgroundColor: '#ffffff', borderWidth: 1, borderStyle: 'dashed'}}>
            <Row key={1}>
                <Col>
                    <Row>
                        <Radio selected={_.isNil(value) ? false : value}
                               onPress={() => this.toggleFormElementAnswerSelection(true)}/>
                        <Text style={{fontSize: 16, marginLeft: 11}}>{this.props.element.truthDisplayValue}</Text>
                    </Row>
                </Col>
                <Col>
                    <Row>
                        <Radio selected={_.isNil(value) ? false : !value}
                               onPress={() => this.toggleFormElementAnswerSelection(false)}/>
                        <Text style={{fontSize: 16, marginLeft: 11}}>{this.props.element.falseDisplayValue}</Text>
                    </Row>
                </Col>
            </Row>
        </Grid>);

    }

    render() {
        return (
            <View>
                <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                </Row>
                {this.renderSingleSelectAnswers()}
            </View>);
    }
}

export default BooleanFormElement;