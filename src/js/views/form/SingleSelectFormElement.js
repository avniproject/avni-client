import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import _ from "lodash";
import {Text, Grid, Col, Row, Radio} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from '../form/ValidationErrorMessage';
import Fonts from '../primitives/Fonts';

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

    toggleFormElementAnswerSelection(formElement, answer) {
        return () => {
            this.dispatchAction(this.props.actionName, {formElement: formElement, answerUUID: answer.concept.uuid});
        }
    }

    renderAnswer(answer) {
        return <View style={{flex: 0.5, flexDirection: 'row'}}>
            <Radio selected={this.props.singleCodedValue.hasValue(answer.concept.uuid)}
                   onPress={this.toggleFormElementAnswerSelection(this.props.element, answer)}/>
            <Text style={{fontSize: Fonts.Large, marginLeft: 11, color: this.textColor}}>{this.I18n.t(answer.concept.name)}</Text>
        </View>
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
                        {this.renderAnswer(answer1)}
                        {_.isNil(answer2) ? <View style={{flex: 0.5}}/> : this.renderAnswer(answer2)}
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
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
                {this.renderSingleSelectAnswers()}
            </View>);
    }
}

export default SingleSelectFormElement;