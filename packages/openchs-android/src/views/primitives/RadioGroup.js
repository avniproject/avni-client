import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import DGS from "./DynamicGlobalStyles";
import {Text, Grid, Row, Radio} from "native-base";
import Colors from '../primitives/Colors';
import PresetOptionItem from "./PresetOptionItem";
import Distances from "./Distances";
import Styles from "./Styles";
import _ from 'lodash';
import ValidationErrorMessage from "../form/ValidationErrorMessage";


export class RadioLabelValue {
    constructor(label, value, abnormal) {
        this.label = label;
        this.value = value;
        this.abnormal = abnormal;
    }
}

class RadioGroup extends AbstractComponent {
    static defaultProps = {
        style: {},
        borderStyle: {},
        inPairs: false,
        multiSelect: false,
    };

    static propTypes = {
        onPress: React.PropTypes.func.isRequired,
        labelKey: React.PropTypes.string.isRequired,
        labelValuePairs: React.PropTypes.array.isRequired,
        selectionFn: React.PropTypes.func.isRequired,
        validationError: React.PropTypes.object,
        style: React.PropTypes.object,
        borderStyle: React.PropTypes.object,
        mandatory: React.PropTypes.bool,
        inPairs: React.PropTypes.bool,
        multiSelect: React.PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context);
    }

    renderPairedOptions() {
        return _.chunk(this.props.labelValuePairs, 2).map((rlvPair, idx) =>
            <View style={{flexDirection: "row", justifyContent: "space-between"}} key={idx}>
                {rlvPair.map((rlv) =>
                    <PresetOptionItem displayText={this.I18n.t(rlv.label)}
                                      checked={this.props.selectionFn(rlv.value)}
                                      abnormal={rlv.abnormal}
                                      multiSelect={this.props.multiSelect}
                                      chunked={true}
                                      validationResult={this.props.validationError}
                                      onPress={() => this.props.onPress(rlv)}
                                      key={rlv.label}
                                      style={{paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
                                          paddingRight: Distances.HorizontalSpacingBetweenOptionItems}}/>
                )}
            </View>);
    }

    renderOptions() {
        return this.props.labelValuePairs.map(radioLabelValue =>
            <PresetOptionItem displayText={this.I18n.t(radioLabelValue.label)}
                              checked={this.props.selectionFn(radioLabelValue.value)}
                              multiSelect={this.props.multiSelect}
                              validationResult={this.props.validationError}
                              onPress={() => this.props.onPress(radioLabelValue)}
                              key={radioLabelValue.label}
                              style={{paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
                                  paddingRight: Distances.HorizontalSpacingBetweenOptionItems}}/>)
    }

    render() {
        const mandatoryText = this.props.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        return (
            <View style={this.appendedStyle({})}>
                <Text style={Styles.formLabel}>{this.I18n.t(this.props.labelKey)}{mandatoryText}</Text>
                {this.props.labelValuePairs.length > 0 ?
                <View style={[{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                    paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
                }, this.props.borderStyle]}>
                    {this.props.inPairs ? this.renderPairedOptions() : this.renderOptions()}
                </View> : <View/> }
                <View style={{backgroundColor: '#ffffff'}}>
                    <ValidationErrorMessage validationResult={this.props.validationError}/>
                </View>
            </View>
        );
    }
}

export default RadioGroup;