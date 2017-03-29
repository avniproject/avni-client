import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import _ from "lodash";
import {Text, Radio} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from '../form/ValidationErrorMessage';

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
        return (<View style={{padding: 28, backgroundColor: '#ffffff', borderWidth: 1, borderStyle: 'dashed', flexDirection: 'column'}}>
            <View key={1} style={{flexDirection: 'row'}}>
                <View style={{flexDirection: 'column', flex: 0.5}}>
                    <View style={{flexDirection: 'row'}}>
                        <Radio selected={this.isTrueSelected()}
                               onPress={() => this.toggleFormElementAnswerSelection(this.isTrueSelected() ? null : true)}/>
                        <Text style={{fontSize: 16, marginLeft: 11}}>{this.I18n.t(this.props.element.truthDisplayValue)}</Text>
                    </View>
                </View>
                <View style={{flexDirection: 'column', flex: 0.5}}>
                    <View style={{flexDirection: 'row'}}>
                        <Radio selected={this.isFalseSelected()}
                               onPress={() => this.toggleFormElementAnswerSelection(this.isFalseSelected() ? null : false)}/>
                        <Text style={{fontSize: 16, marginLeft: 11}}>{this.I18n.t(this.props.element.falseDisplayValue)}</Text>
                    </View>
                </View>
            </View>
        </View>);

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
            <View style={{flexDirection: 'column'}}>
                <View style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
                {this.renderSingleSelectAnswers()}
            </View>);
    }
}

export default BooleanFormElement;