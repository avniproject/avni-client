import {StyleSheet, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Checkbox, Radio, Text} from "native-base";
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
        skipLabel: false
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
        skipLabel: PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context);
        const valuesArray = _.filter(this.props.labelValuePairs,
            (x) => this.props.selectionFn(x.value))
            .map((lvPair) => lvPair.value);
        this.state = {
            groupValue: this.getAppropriateInitializedValue(valuesArray),
        };
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
                                      key={rlv.label}
                                      style={{
                                          paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
                                          paddingRight: Distances.HorizontalSpacingBetweenOptionItems
                                      }}
                                      disabled={this.props.disabled}
                                      value={rlv.value}/>
                )}
            </View>);
    }

    renderOptions() {
        return this.props.labelValuePairs.map(radioLabelValue =>
            <PresetOptionItem displayText={this.I18n.t(radioLabelValue.label)}
                              checked={this.props.selectionFn(radioLabelValue.value)}
                              multiSelect={this.props.multiSelect}
                              validationResult={this.props.validationError}
                              key={radioLabelValue.label}
                              style={{
                                  paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
                                  paddingRight: Distances.HorizontalSpacingBetweenOptionItems
                              }}
                              disabled={this.props.disabled}
                              value={radioLabelValue.value}
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
        const GroupComponent = this.props.multiSelect ? Checkbox.Group : Radio.Group;
        return (
            <View style={this.appendedStyle({})}>
                {!this.props.skipLabel &&
                <Text style={Styles.formLabel}>{this.I18n.t(this.props.labelKey)}{mandatoryText}</Text>}
                {this.props.labelValuePairs.length > 0 ? this.props.labelValuePairs.length === 1 && this.props.mandatory === true ?
                        <View style={[style.radioStyle, this.props.borderStyle]}>
                            {this.renderSingleValue()}
                        </View> :
                        <GroupComponent accessibilityLabel={this.props.labelKey} style={[style.radioStyle, this.props.borderStyle]}
                                     value={this.state.groupValue} onChange={newValues => this.invokeOnPressForChangedValues(newValues)}>
                            {this.props.inPairs ? this.renderPairedOptions() : this.renderOptions()}
                        </GroupComponent>
                    : <View/>}
                <View style={{backgroundColor: '#ffffff'}}>
                    <ValidationErrorMessage validationResult={this.props.validationError}/>
                </View>
            </View>
        );
    }

    invokeOnPressForChangedValues(newValue) {
        let safeInitNewValue = this.getAppropriateInitializedValue(newValue);
        if(_.isString(safeInitNewValue)) {
            this.props.onPress({value: this.state.groupValue}); //Invoke toggle to unset for oldValue
            this.props.onPress({value: safeInitNewValue}); //Invoke toggle to set for oldValue
        } else {
            _.xor(safeInitNewValue, this.state.groupValue).forEach(value => {
                    this.props.onPress({value: value}); //Invoke toggle for all changed values
                }
            );
        }
        this.setState({groupValue: safeInitNewValue});
    }

    getAppropriateInitializedValue(value) {
        return value || (this.props.multiSelect ? [] : "");
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
