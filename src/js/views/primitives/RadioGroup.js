import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "./DynamicGlobalStyles";
import {Text, Grid, Row, Radio} from "native-base";
import _ from 'lodash';
import Colors from '../primitives/Colors';
import PresetOptionItem from "./PresetOptionItem";

class RadioGroup extends AbstractComponent {
    static propTypes = {
        action: React.PropTypes.string.isRequired,
        labelKey: React.PropTypes.string.isRequired,
        labelValuePairs: React.PropTypes.array.isRequired,
        selectionFn: React.PropTypes.func.isRequired,
        validationError: React.PropTypes.object,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={this.appendedStyle({})}>
                <View>
                    <Text style={DGS.formElementLabel}>{this.I18n.t(this.props.labelKey)}</Text>
                </View>
                {this.props.labelValuePairs.map((radioLabelValue) =>
                    <PresetOptionItem displayText={this.I18n.t(radioLabelValue.radioLabel)} checked={this.props.selectionFn(radioLabelValue.value)}
                                      multiSelect={false} validationResult={this.props.validationError}
                                      onPress={() => this.dispatchAction(this.props.action, {value: radioLabelValue.value})} key={radioLabelValue.radioLabel} />)
                }
            </View>
        );
    }
}

export class RadioLabelValue {
    constructor(radioLabel, value) {
        this.radioLabel = radioLabel;
        this.value = value;
    }
}

export default RadioGroup;