import React from "react";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import AddressLevelService from "../../../service/AddressLevelService";
import LocationHierarchyService from "../../../service/LocationHierarchyService";
import {Concept} from "openchs-models";
import PropTypes from "prop-types";
import _ from "lodash";
import AddressLevels from "../../common/AddressLevels";
import General from "../../../utility/General";

class LocationHierarchyInput extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.addressLevelService = context.getService(this.isWithinCatchment() ? AddressLevelService : LocationHierarchyService);
    }

    static propTypes = {
        concept: PropTypes.object.isRequired,
        value: PropTypes.object,
        onSelect: PropTypes.func
    };

    isWithinCatchment() {
        return this.props.concept.recordValueByKey(Concept.keys.isWithinCatchment);
    }

    minLevelTypeUUIDs() {
        const lowestAddressLevelTypeUUIDs = this.props.concept.recordValueByKey(Concept.keys.lowestAddressLevelTypeUUIDs);
        return !_.isEmpty(lowestAddressLevelTypeUUIDs) ? lowestAddressLevelTypeUUIDs : this.addressLevelService.minTypeUUIDs();
    }

    maxLevelTypeUUID() {
        const highestAddressLevelTypeUUID = this.props.concept.recordValueByKey(Concept.keys.highestAddressLevelTypeUUID);
        return !_.isEmpty(highestAddressLevelTypeUUID) ? highestAddressLevelTypeUUID : this.addressLevelService.maxTypeUUID();
    }

    render() {
        const {value, onSelect} = this.props;
        const lowestAddressLevel = !_.isEmpty(_.get(value, 'answer')) ? this.addressLevelService.findByUUID(value.answer) : null;

        return <AddressLevels
            selectedLowestLevel={lowestAddressLevel}
            multiSelect={false}
            onLowestLevel={(lowestSelectedAddresses) => onSelect(lowestSelectedAddresses)}
            skipLabel={true}
            minLevelTypeUUIDs={this.minLevelTypeUUIDs()}
            maxLevelTypeUUID={this.maxLevelTypeUUID()}
            isOutsideCatchment={!this.isWithinCatchment()}
        />
    }
}

export default LocationHierarchyInput;
