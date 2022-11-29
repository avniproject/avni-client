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
        /*
         * We are making use of state as a cache of value, in-order to improve user-experience.
         * Checkbox doesn't wait for props to get updated with the latest value.
         * Use of state, reduces lag between the checkbox/radio being clicked and it being marked as selected on screen.
         */
        this.state = {
            groupValues: this.getAppropriateInitializedValue(this.initializeSelectedValue()),
        };
    }

    renderPairedOptions(onRadioItemPressed) {
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
                                          paddingVertical: Distances.VerticalSpacingBetweenOptionItems
                                      }}
                                      disabled={this.props.disabled}
                                      value={rlv.value} radioItemPressed={onRadioItemPressed}/>
                )}
            </View>);
    }

    renderOptions(onRadioItemPressed) {
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
                              radioItemPressed={onRadioItemPressed}
            />);
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
        const {mandatory, multiSelect, labelValuePairs, skipLabel, labelKey, borderStyle, inPairs, validationError} = this.props;
        const {groupValues} = this.state;

        const mandatoryText = mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        const GroupComponent = multiSelect ? Checkbox.Group : Radio.Group;
        const onRadioValuePressed = multiSelect ? _.noop : this.onRadioValuePress.bind(this);
        return (
            <View style={this.appendedStyle({})}>
                {!skipLabel &&
                <Text style={Styles.formLabel}>{this.I18n.t(labelKey)}{mandatoryText}</Text>}
                {labelValuePairs.length > 0 ? labelValuePairs.length === 1 && mandatory === true ?
                    <View style={[style.radioStyle, borderStyle]}>
                        {this.renderSingleValue()}
                    </View> :
                    <GroupComponent accessibilityLabel={labelKey} style={[style.radioStyle, borderStyle]}
                                    value={groupValues || ''} onChange={newValues => this.onValueChanged(newValues)}>
                        {inPairs ? this.renderPairedOptions(onRadioValuePressed) : this.renderOptions(onRadioValuePressed)}
                    </GroupComponent>
                    : <View/>}
                <View style={{backgroundColor: '#ffffff'}}>
                    <ValidationErrorMessage validationResult={validationError}/>
                </View>
            </View>
        );
    }

    onRadioValuePress(value) {
        if (!this.props.multiSelect && _.includes(this.state.groupValues, value)) {
            this.props.onPress({value: this.state.groupValues});
            this.setState({groupValues: null});
        }
    }

    onValueChanged(newValues) {
        const safelyInitialisedNewValues = this.getAppropriateInitializedValue(newValues);
        this.setState({groupValues: safelyInitialisedNewValues});
        if (this.props.multiSelect) {
            _.xor(safelyInitialisedNewValues, this.state.groupValues).forEach(value => {
                    value && this.props.onPress({value: value}); //Invoke toggle for all changed values
                }
            );
        } else {
            this.state.groupValues && this.props.onPress({value: this.state.groupValues}); //Invoke toggle to unset for old value
            this.props.onPress({value: safelyInitialisedNewValues}); //Invoke toggle to set for new Value
        }
    }

    initializeSelectedValue() {
        const values = _.filter(this.props.labelValuePairs,
            (x) => this.props.selectionFn(x.value))
            .map((lvPair) => lvPair.value);

        let initValue = values;
        if (!this.props.multiSelect) {
            initValue = values.length === 0 ? undefined : values[0];
        }
        return initValue;
    }

    getAppropriateInitializedValue(value) {
        if (this.props.multiSelect) {
            return _.isNil(value) ? [] : value;
        }
        return value;
    }
}

export default RadioGroup;
const style = StyleSheet.create({
    radioStyle: {
        borderWidth: 1,
        borderRadius: 1,
        borderStyle: 'dashed',
        borderColor: Colors.InputBorderNormal,
        paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
    }
})
