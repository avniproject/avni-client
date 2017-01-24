import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {Text, Grid, Col, Row, Radio} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';



class SingleSelectFormElement extends AbstractComponent {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName : React.PropTypes.string.isRequired,
        selectedAnswer : React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(concept, answer) {
        return () => {
            this.dispatchAction(this.props.actionName, {concept: concept, answerUUID: answer.uuid});
        }
    }

    renderSingleSelectAnswers() {
        return(<Grid style={{
                        padding: 28,
                        backgroundColor: '#ffffff',
                        borderWidth: 1
                    }}>{
            _.chunk(this.props.element.concept.answers, 2).map(([answer1, answer2], idx) => {
                        return (
                            <Row key={idx}>
                                <Col>
                                    <Row>
                                        <Radio selected= {!_.isEmpty(this.props.selectedAnswer) && this.props.selectedAnswer.conceptUUID === answer1.uuid}
                                               onPress={this.toggleFormElementAnswerSelection(this.props.element.concept, answer1)}/>
                                        <Text style={{fontSize: 16, marginLeft: 11}}>{answer1.name}</Text>
                                    </Row>
                                </Col>
                                <Col>
                                    <Row>
                                        <Radio selected={!_.isEmpty(this.props.selectedAnswer) && this.props.selectedAnswer.conceptUUID === answer2.uuid}
                                               onPress={this.toggleFormElementAnswerSelection(this.props.element.concept, answer2)}/>
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

export default SingleSelectFormElement;