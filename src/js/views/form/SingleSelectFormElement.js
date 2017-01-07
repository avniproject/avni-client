import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Radio
} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import MultiSelectFormElement from './MultiSelectFormElement';


class FormElement extends AbstractComponent {
    static propTypes = {
        element: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    renderSingleSelectAnswers() {
        return(<Grid style={{
                        padding: 28,
                        backgroundColor: '#ffffff',
                        borderWidth: 1
                    }}>{
            _.chunk(this.props.element.concept.answers, 2).map(([answer1, answer2]) => {
                        return (
                            <Row>
                                <Col>
                                    <Row>
                                        <Radio/>
                                        <Text style={{fontSize: 16, marginLeft: 11}}>{answer1.name}</Text>
                                    </Row>
                                </Col>
                                <Col>
                                    <Row>
                                        <Radio/>
                                        <Text style={{fontSize: 16, marginLeft: 11}}>{answer2.name}</Text>
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
                        <Text style={DynamicGlobalStyles.formElementLabel}>{this.props.element.name}</Text>
                    </Row>
                    {this.renderSingleSelectAnswers()}
                </View>);
    }
}

export default FormElement;