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

    toggleFormElementAnswerSelection(value) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: value});
    }

    renderSingleSelectAnswers() {
        return (<Grid style={{padding: 28, backgroundColor: '#ffffff', borderWidth: 1, borderStyle: 'dashed'}}>
            <Row key={1}>
                <Col>
                    <Row>
                        <Radio selected={this.isTrueSelected()}
                               onPress={() => this.toggleFormElementAnswerSelection(this.isTrueSelected() ? null : true)}/>
                        <Text style={{fontSize: 16, marginLeft: 11}}>{this.props.element.truthDisplayValue}</Text>
                    </Row>
                </Col>
                <Col>
                    <Row>
                        <Radio selected={this.isFalseSelected()}
                               onPress={() => this.toggleFormElementAnswerSelection(this.isFalseSelected() ? null : false)}/>
                        <Text style={{fontSize: 16, marginLeft: 11}}>{this.props.element.falseDisplayValue}</Text>
                    </Row>
                </Col>
            </Row>
        </Grid>);

    }

    isFalseSelected(){
        let value = this.props.observationValue.getValue();
        return _.isNil(value) ? false : !value
    }

    isTrueSelected(){
        let value = this.props.observationValue.getValue();
        return _.isNil(value) ? false : value
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