import React from "react";
import PropTypes from 'prop-types';
import AbstractFormElement from "./AbstractFormElement";
import AddressLevels from "../../common/AddressLevels";
import {View} from "react-native";
import ValidationErrorMessage from "../ValidationErrorMessage";
import _ from "lodash";
import AddressLevelService from "../../../service/AddressLevelService";
import {Concept} from 'openchs-models'
import LocationHierarchyService from "../../../service/LocationHierarchyService";

class LocationHierarchyFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };
    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
        this.addressLevelService = context.getService(this.isWithinCatchment() ? AddressLevelService : LocationHierarchyService);
    }

    onSelect(lowestSelectedAddresses) {
        const addressLevel = _.head(lowestSelectedAddresses);
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            value: addressLevel ? addressLevel.uuid : null
        });
    }

    minLevelTypeUUIDs() {
        const lowestAddressLevelTypeUUIDs = this.props.element.concept.recordValueByKey(Concept.keys.lowestAddressLevelTypeUUIDs);
        return !_.isEmpty(lowestAddressLevelTypeUUIDs) ? lowestAddressLevelTypeUUIDs : this.addressLevelService.minTypeUUIDs();
    }

    maxLevelTypeUUID() {
        const highestAddressLevelTypeUUID = this.props.element.concept.recordValueByKey(Concept.keys.highestAddressLevelTypeUUID);
        return !_.isEmpty(highestAddressLevelTypeUUID) ? highestAddressLevelTypeUUID : this.addressLevelService.maxTypeUUID();
    }

    isWithinCatchment() {
        return this.props.element.concept.recordValueByKey(Concept.keys.isWithinCatchment) !== 'false';
    }

    render() {
        const lowestAddressLevel = !_.isEmpty(_.get(this.props.value, 'answer')) ? this.addressLevelService.findByUUID(this.props.value.answer) : null;

        return (
            <View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
                {this.label}
                <AddressLevels
                    selectedLowestLevel={lowestAddressLevel}
                    multiSelect={false}
                    onLowestLevel={(lowestSelectedAddresses) => this.onSelect(lowestSelectedAddresses)}
                    skipLabel={true}
                    minLevelTypeUUIDs={this.minLevelTypeUUIDs()}
                    maxLevelTypeUUID={this.maxLevelTypeUUID()}
                    isOutsideCatchment={!this.isWithinCatchment()}
                />
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>)
    }
}

export default LocationHierarchyFormElement;
