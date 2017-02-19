import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import _ from "lodash";
import {Text, Grid, Col, Row, Radio} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AbstractFormElement from "./AbstractFormElement";

class SingleSelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        singleCodedValue: React.PropTypes.object.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(concept, answer) {
        return () => {
            this.dispatchAction(this.props.actionName, {concept: concept, answerUUID: answer.concept.uuid});
        }
    }

    renderSingleSelectAnswers() {
        return (<View style={{
            padding: 28,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderStyle: 'dashed',
            flexDirection: 'column'
        }}>{
            _.chunk(this.props.element.concept.answers, 2).map(([answer1, answer2], idx) => {
                return (
                    <View key={idx} style={{flexDirection: 'row'}}>
                        <View style={{flex: 0.5, flexDirection: 'row'}}>
                            <Radio selected={this.props.singleCodedValue.hasValue(answer1.concept.uuid)}
                                   onPress={this.toggleFormElementAnswerSelection(this.props.element.concept, answer1)}/>
                            <Text style={{fontSize: 16, marginLeft: 11}}>{this.I18n.t(answer1.concept.name)}</Text>
                        </View>
                        <View style={{flex: 0.5, flexDirection: 'row'}}>
                            <Radio selected={this.props.singleCodedValue.hasValue(answer2.concept.uuid)}
                                   onPress={this.toggleFormElementAnswerSelection(this.props.element.concept, answer2)}/>
                            <Text style={{fontSize: 16, marginLeft: 11}}>{this.I18n.t(answer2.concept.name)}</Text>
                        </View>
                    </View>
                )
            })
        }
        </View>);

    }

    render() {
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                </View>
                {this.renderSingleSelectAnswers()}
            </View>);
    }
}

export default SingleSelectFormElement;