import {View, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
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
        disabled: false,
    };

    static propTypes = {
        onPress: PropTypes.func.isRequired,
        labelKey: PropTypes.string.isRequired,
        labelValuePairs: PropTypes.array.isRequired,
        selectionFn: PropTypes.func.isRequired,
        validationError: PropTypes.object,
        style: PropTypes.object,
        borderStyle: PropTypes.object,
        mandatory: PropTypes.bool,
        inPairs: PropTypes.bool,
        multiSelect: PropTypes.bool,
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
                                      style={{
                                          paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
                                          paddingRight: Distances.HorizontalSpacingBetweenOptionItems
                                      }}
                                      disabled={this.props.disabled}/>
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
                              style={{
                                  paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
                                  paddingRight: Distances.HorizontalSpacingBetweenOptionItems
                              }}
                              disabled={this.props.disabled}
                              />)
    }

    renderSingleValue() {
        const radioLabelValue = _.head(this.props.labelValuePairs);
        if (!this.props.selectionFn(radioLabelValue.value)) {
            this.props.onPress(radioLabelValue);
        }
        return (
            <Text style={Styles.formLabel}>{radioLabelValue.label}</Text>
        )
    }

    render() {
        const mandatoryText = this.props.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        return (
            <View style={this.appendedStyle({})}>
                <Text style={Styles.formLabel}>{this.I18n.t(this.props.labelKey)}{mandatoryText}</Text>
                {this.props.labelValuePairs.length > 0 ? this.props.labelValuePairs.length === 1 && this.props.mandatory === true ?
                    <View style={[style.radioStyle, this.props.borderStyle]}>
                        {this.renderSingleValue()}
                    </View> :
                    <View style={[style.radioStyle, this.props.borderStyle]}>
                        {this.props.inPairs ? this.renderPairedOptions() : this.renderOptions()}
                    </View> : <View/>}
                <View style={{backgroundColor: '#ffffff'}}>
                    <ValidationErrorMessage validationResult={this.props.validationError}/>
                </View>
            </View>
        );
    }
}

export default RadioGroup;
const style = StyleSheet.create({
    radioStyle: {
        borderWidth: 1,
        borderRadius: 1,
        borderStyle: 'dashed',
        borderColor: Colors.InputBorderNormal,
        paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
        paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
    }
})
