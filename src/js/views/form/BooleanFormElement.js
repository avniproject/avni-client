import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {Text, Grid, Col, Row, Radio} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';

class BooleanFormElement extends AbstractComponent {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(concept, answer) {
        return () => {
            this.dispatchAction(this.props.actionName, {concept: concept, answer: answer});
        }
    }

    renderSingleSelectAnswers() {
        return (<Grid style={{padding: 28, backgroundColor: '#ffffff', borderWidth: 1, borderStyle: 'dashed'}}>
            <Row key={1}>
                <Col>
                    <Row>
                        <Radio selected={_.isNil(this.props.value) ? false : this.props.value}
                               onPress={this.toggleFormElementAnswerSelection(this.props.element.concept, true)}/>
                        <Text style={{fontSize: 16, marginLeft: 11}}>{this.props.element.truthDisplayValue}</Text>
                    </Row>
                </Col>
                <Col>
                    <Row>
                        <Radio selected={_.isNil(this.props.value) ? false : this.props.value}
                               onPress={this.toggleFormElementAnswerSelection(this.props.element.concept, false)}/>
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
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.props.element.name}</Text>
                </Row>
                {this.renderSingleSelectAnswers()}
            </View>);
    }
}

export default BooleanFormElement;