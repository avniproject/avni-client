import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "./DynamicGlobalStyles";
import {Text, Grid, Row, Radio} from "native-base";
import Colors from '../primitives/Colors';
import PresetOptionItem from "./PresetOptionItem";
import Distances from "./Distances";
import Styles from "./Styles";

class RadioGroup extends AbstractComponent {
    static propTypes = {
        action: React.PropTypes.string.isRequired,
        labelKey: React.PropTypes.string.isRequired,
        labelValuePairs: React.PropTypes.array.isRequired,
        selectionFn: React.PropTypes.func.isRequired,
        validationError: React.PropTypes.object,
        style: React.PropTypes.object,
        mandatory : React.PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const mandatoryText = this.props.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text></Text>;
        return (
            <View style={this.appendedStyle({})}>
                <Text style={Styles.formLabel}>{this.I18n.t(this.props.labelKey)}{mandatoryText}</Text>
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                    marginTop: DGS.resizeHeight(16),
                    paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
                }}>
                    {this.props.labelValuePairs.map((radioLabelValue) =>
                        <PresetOptionItem displayText={this.I18n.t(radioLabelValue.radioLabel)} checked={this.props.selectionFn(radioLabelValue.value)}
                                          multiSelect={false} validationResult={this.props.validationError}
                                          onPress={() => this.dispatchAction(this.props.action, {value: radioLabelValue.value})} key={radioLabelValue.radioLabel}
                                          style={{paddingTop: Distances.VerticalSpacingBetweenOptionItems}}/>)
                    }
                </View>
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