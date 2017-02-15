import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {Text, CheckBox, Grid, Col, Row } from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import Observation from "../../models/Observation";
import AbstractFormElement from "./AbstractFormElement";

class MultiSelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName : React.PropTypes.string.isRequired,
        multipleCodeValues : React.PropTypes.object.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(answer) {
        return () => {
            this.dispatchAction(this.props.actionName, {formElement: this.props.element, answerUUID: answer.concept.uuid});
        }
    }

    renderMultiSelectAnswers() {
        return(<Grid style={{
                        padding: 28,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderStyle: 'dashed'
                    }}>{
            _.chunk(this.props.element.concept.answers, 2).map(([answer1, answer2], idx) => {
                        return (
                            <Row key={idx}>
                                    <Col>
                                    <Row>
                                        <CheckBox
                                            checked={this.props.multipleCodeValues.isAnswerAlreadyPresent(answer1.concept.uuid)}
                                            onPress={this.toggleFormElementAnswerSelection(answer1)}/>
                                        <Text style={{fontSize: 16, marginLeft: 11}}>{answer1.concept.name}</Text>
                                    </Row>
                                </Col>
                                <Col>
                                    <Row>
                                        <CheckBox
                                            checked={this.props.multipleCodeValues.isAnswerAlreadyPresent(answer2.concept.uuid)}
                                            onPress={this.toggleFormElementAnswerSelection(answer2)}/>
                                        <Text style={{fontSize: 16, marginLeft: 11}}>{answer2.concept.name}</Text>
                                    </Row>
                                </Col>
                            </Row>
                        )})
                    }
        </Grid>);

    }

    render() {
            return (
                <View>
                    <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                        <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                    </Row>
                {this.renderMultiSelectAnswers()}
                </View>);
    }

}

export default MultiSelectFormElement;