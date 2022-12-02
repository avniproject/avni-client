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

function initializeSelectedValue(props) {
    const values = _.filter(props.labelValuePairs,
        (x) => props.selectionFn(x.value))
        .map((lvPair) => lvPair.value);

    let initValue = values;
    if (!props.multiSelect) {
        initValue = values.length === 0 ? undefined : values[0];
    }
    return initValue;
}

function getAppropriateInitializedValue(props, value) {
    if (props.multiSelect) {
        return _.isNil(value) ? [] : value;
    }
    return value;
}

function shouldStateBeUpdated(nextProps, newGroupValues, oldGroupValues) {
    if (nextProps.multiSelect) {
        return _.xor(newGroupValues, oldGroupValues).length > 0;
    } else {
        return newGroupValues !== oldGroupValues;
    }
}

class RadioGroup extends AbstractComponent {
    static defaultProps = {
        style: {},
        borderStyle: {},
        inPairs: false,
        multiSelect: false,
        disabled: false,
        skipLabel: false,
        allowRadioUnselect: false
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
        allowRadioUnselect: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
        /*
         * We are making use of state as a cache of value, in-order to improve user-experience.
         * Checkbox doesn't wait for props to get updated with the latest value.
         * Use of state, reduces lag between the checkbox/radio being clicked and it being marked as selected on screen.
         */
        this.state = {
            groupValues: getAppropriateInitializedValue(this.props, initializeSelectedValue(this.props)),
        };
    }

    renderPairedOptions(onRadioItemPressed) {
        return _.chunk(this.props.labelValuePairs, 2).map((rlvPair, idx) =>
            <View style={{flexDirection: "row", justifyContent: "space-between"}} key={idx}>
                {rlvPair.map((rlv) => {
                        let checked = this.props.selectionFn(rlv.value);
                        let onRadioItemPress = checked ? onRadioItemPressed : null;
                        return <PresetOptionItem displayText={this.I18n.t(rlv.label)}
                                                 checked={checked}
                                                 abnormal={rlv.abnormal}
                                                 multiSelect={this.props.multiSelect}
                                                 chunked={true}
                                                 validationResult={this.props.validationError}
                                                 key={rlv.label}
                                                 style={{
                                                     paddingVertical: Distances.VerticalSpacingBetweenOptionItems
                                                 }}
                                                 disabled={this.props.disabled}
                                                 value={rlv.value}
                                                 radioItemPressed={onRadioItemPress}/>;
                    }
                )}
            </View>);
    }

    renderOptions(onRadioItemPressed) {
        return this.props.labelValuePairs.map(radioLabelValue => {
            let checked = this.props.selectionFn(radioLabelValue.value);
            let onRadioItemPress = checked ? onRadioItemPressed : null;
            return <PresetOptionItem displayText={this.I18n.t(radioLabelValue.label)}
                                     checked={checked}
                                     multiSelect={this.props.multiSelect}
                                     validationResult={this.props.validationError}
                                     key={radioLabelValue.label}
                                     style={{
                                         paddingVertical: Distances.VerticalSpacingBetweenOptionItems,
                                         paddingRight: Distances.HorizontalSpacingBetweenOptionItems
                                     }}
                                     disabled={this.props.disabled}
                                     value={radioLabelValue.value}
                                     radioItemPressed={onRadioItemPress}
            />;
        });
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

    /**
     * Purpose: This method is invoked just before render and is used in-order to consolidate
     * changes to be made to the state, based on rule execution or other actions' effects,
     * flowing in via props.
     *
     * We could not directly use props without state, as this resulted in poor User experience,
     * with considerable lag between checkbox/radio-button press and visual indication of the same.
     *
     * Read https://reactjs.org/docs/react-component.html#static-getderivedstatefromprops for more info.
     *
     * RadioGroup methods.
     * @param nextProps
     * @param prevState
     * @returns {null|{groupValues: ([]|*)}}
     */
    static getDerivedStateFromProps(nextProps, prevState) {
        const newGroupValues = getAppropriateInitializedValue(nextProps, initializeSelectedValue(nextProps));
        const oldGroupValues = getAppropriateInitializedValue(nextProps, prevState.groupValues);
        if (shouldStateBeUpdated(nextProps, newGroupValues, oldGroupValues)) {
            return {groupValues: newGroupValues};
        }
        return null;
    }

    render() {
        const {mandatory, multiSelect, labelValuePairs, allowRadioUnselect, skipLabel, labelKey, borderStyle, inPairs, validationError} = this.props;
        const {groupValues} = this.state;

        const mandatoryText = mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        const GroupComponent = multiSelect ? Checkbox.Group : Radio.Group;
        //Do not replace null with noop as that would set a listener and not allow the message to prop up to higher level
        const onRadioValuePressed = (!multiSelect && allowRadioUnselect) ? this.onRadioValuePress.bind(this) : null;

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
        const newValue = this.state.groupValues === value ? null : value;
        this.props.onPress({value: value});
        this.setState({groupValues: newValue});
    }

    onValueChanged(newValues) {
        const safelyInitialisedNewValues = getAppropriateInitializedValue(this.props, newValues);
        this.setState({groupValues: safelyInitialisedNewValues});
        if (this.props.multiSelect) {
            _.xor(safelyInitialisedNewValues, this.state.groupValues).forEach(value => {
                    value && this.props.onPress({value: value}); //Invoke toggle for all changed values
                }
            );
        } else {
            this.props.onPress({value: safelyInitialisedNewValues}); //Invoke toggle to set for new Value, this also unsets old value
        }
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
