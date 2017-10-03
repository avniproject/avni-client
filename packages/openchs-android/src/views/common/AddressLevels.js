import {View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {BaseEntity} from "openchs-models";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';
import Reducers from "../../reducer";
import Fonts from '../primitives/Fonts';
import Distances from '../primitives/Distances';
import PresetOptionItem from "../primitives/PresetOptionItem";
import Styles from "../primitives/Styles";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool.isRequired,
        selectedAddressLevels: React.PropTypes.array.isRequired,
        actionName: React.PropTypes.string.isRequired,
        validationError: React.PropTypes.object,
        style: React.PropTypes.object,
        mandatory: React.PropTypes.bool
    };

    viewName() {
        return 'AddressLevels';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addressLevels);
        this.inputTextStyle = {fontSize: Fonts.Large, marginLeft: 11, color: Colors.InputNormal};
    }

    toggleAddressLevelSelection(addressLevelUuid) {
        const selectedAddressLevel = this.state.addressLevels.find((al) => al.uuid === addressLevelUuid);
        return this.dispatchAction(this.props.actionName, {value: selectedAddressLevel});
    }

    refreshState() {
        this.setState({addressLevels: this.getContextState("addressLevels")});
    }

    render() {
        const valueLabelPairs = this.state.addressLevels.map(({uuid, name}) => new RadioLabelValue(name, uuid));
        return (
            <RadioGroup
                multiSelect={this.props.multiSelect}
                style={this.props.style}
                inPairs={true}
                onPress={({label, value}) => this.toggleAddressLevelSelection(value)}
                selectionFn={(addressLevel) => this.props.selectedAddressLevels.some((al) => al.uuid === addressLevel)}
                labelKey="lowestAddressLevel"
                mandatory={this.props.mandatory}
                labelValuePairs={valueLabelPairs}/>
        );
    }
}

export default AddressLevels;