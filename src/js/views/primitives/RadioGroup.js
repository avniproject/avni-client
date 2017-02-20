import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "./DynamicGlobalStyles";
import {Text, Grid, Row, Radio} from "native-base";
import _ from 'lodash';
import Colors from '../primitives/Colors';

class RadioGroup extends AbstractComponent {
    static propTypes = {
        action: React.PropTypes.string.isRequired,
        labelKey: React.PropTypes.string.isRequired,
        labelValuePairs: React.PropTypes.array.isRequired,
        selectionFn: React.PropTypes.func.isRequired,
        validationError: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View>
                <View>
                    <Text style={DGS.formElementLabel}>{this.I18n.t(this.props.labelKey)}</Text>
                </View>
                {this.props.labelValuePairs.map((radioLabelValue) => {
                    return (
                        <View style={{height: 22, marginVertical: DGS.resizeHeight(8), flexDirection: 'row'}} key={radioLabelValue.radioLabel}>
                            <View style={{flexDirection: 'column-reverse'}}>
                                <Radio selected={this.props.selectionFn(radioLabelValue.value)}
                                       onPress={() => this.dispatchAction(this.props.action, {value: radioLabelValue.value})}/>
                            </View>
                            <Text style={[DGS.formRadioText, {color: _.isNil(this.props.validationError) ? Colors.InputLabelNormal : Colors.ValidationError}]}>{this.I18n.t(radioLabelValue.radioLabel)}</Text>
                        </View>);
                })}
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