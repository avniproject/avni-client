import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import _ from "lodash";
import {Text, Radio} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from '../form/ValidationErrorMessage';
import PresetOptionItem from "../primitives/PresetOptionItem";
import Colors from '../primitives/Colors';
import Distances from '../primitives/Distances';

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
        return (<View style={{
            padding: Distances.ScaledContentDistanceFromEdge,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: Colors.InputBorderNormal,
            flexDirection: 'row'
        }}>
            <View style={{flexDirection: 'column', flex: 0.5}}>
                <PresetOptionItem multiSelect={false} checked={this.isTrueSelected()} displayText={this.I18n.t(this.props.element.truthDisplayValue)}
                                  validationResult={this.props.validationResult}
                                  onPress={() => this.toggleFormElementAnswerSelection(true)}/>
            </View>
            <View style={{flexDirection: 'column', flex: 0.5}}>
                <PresetOptionItem multiSelect={false} checked={this.isFalseSelected()} displayText={this.I18n.t(this.props.element.falseDisplayValue)}
                                  validationResult={this.props.validationResult}
                                  onPress={() => this.toggleFormElementAnswerSelection(false)}/>
            </View>
        </View>);
    }

    isFalseSelected() {
        let value = this.props.observationValue.getValue();
        return _.isNil(value) ? false : !value
    }

    isTrueSelected() {
        let value = this.props.observationValue.getValue();
        return _.isNil(value) ? false : value
    }

    render() {
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={{backgroundColor: '#ffffff'}}>
                    {this.label}
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
                {this.renderSingleSelectAnswers()}
            </View>);
    }
}

export default BooleanFormElement;