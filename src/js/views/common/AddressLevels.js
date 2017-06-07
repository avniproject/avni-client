import {View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {CheckBox, Col, Row, Grid, Radio} from "native-base";
import MessageService from "../../service/MessageService";
import BaseEntity from "../../models/BaseEntity";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';
import Reducers from "../../reducer";
import Fonts from '../primitives/Fonts';
import Distances from '../primitives/Distances';
import PresetOptionItem from "../primitives/PresetOptionItem";

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool.isRequired,
        selectedAddressLevels: React.PropTypes.array.isRequired,
        actionName: React.PropTypes.string.isRequired,
        validationError: React.PropTypes.object,
        style: React.PropTypes.object,
        mandatory : React.PropTypes.bool
    };

    viewName() {
        return 'AddressLevels';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addressLevels);
        this.inputTextStyle = {fontSize: Fonts.Large, marginLeft: 11, color: Colors.InputNormal};
    }

    toggleAddressLevelSelection(addressLevel) {
        return this.dispatchAction(this.props.actionName, {value: addressLevel});
    }

    refreshState() {
        this.setState({addressLevels: this.getContextState("addressLevels")});
    }

    presetOption(address) {
        return <PresetOptionItem displayText={this.I18n.t(address.name)} checked={BaseEntity.collectionHasEntity(this.props.selectedAddressLevels, address)}
                                 multiSelect={this.props.multiSelect} onPress={() => this.toggleAddressLevelSelection(address)}
                                 validationResult={this.props.validationError} style={{flex: 1, marginTop: Distances.ScaledVerticalSpacingBetweenOptionItems}}/>
    }

    renderChoices() {
        return _.chunk(this.state.addressLevels, 2).map(([address1, address2], idx) => {
                return (<View
                    key={idx}
                    style={{flexDirection: 'row'}}>
                    {this.presetOption(address1)}
                    {_.isNil(address2) ? <View/> : this.presetOption(address2)}
                </View>)
            }
        );
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();
        const mandatoryText = this.props.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text></Text>;
        return (
            <View style={this.appendedStyle()}>
                <Text style={DGS.formElementLabel}>{I18n.t("lowestAddressLevel")}{mandatoryText}</Text>
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                    marginTop: DGS.resizeHeight(16),
                    paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
                }}>
                    {this.renderChoices()}
                </View>
            </View>
        );
    }
}

export default AddressLevels;