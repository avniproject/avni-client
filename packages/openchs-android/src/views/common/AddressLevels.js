import React from "react";
import _ from 'lodash';
import {View, Text} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import AddressLevel from "./AddressLevel";
import AddressLevelService from "../../service/AddressLevelService";
import AddressLevelsState from "../../action/common/AddressLevelsState";

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool,
        onSelect: React.PropTypes.func,
        onLowestLevel: React.PropTypes.func,
        validationError: React.PropTypes.object,
        mandatory: React.PropTypes.bool
    };

    viewName() {
        return 'AddressLevels';
    }

    constructor(props, context) {
        super(props, context);
        this.addressLevelService = context.getService(AddressLevelService);
        this.state = {data: new AddressLevelsState()};
    }

    defaultState() {
        const highestAddressLevels = this.addressLevelService.highestLevel();
        return new AddressLevelsState(highestAddressLevels);
    }

    selectAddressLevel(state, levelType, selectedLevelUUID, exclusive = false) {
        const selectedLevel = this.addressLevelService.findByUUID(selectedLevelUUID, this.addressLevelService.getSchema());
        const newLevels = this.addressLevelService.getChildrenParent(selectedLevelUUID);
        const data = exclusive ? state.data.selectLevel(levelType, selectedLevel, newLevels) :
            state.data.addLevel(levelType, selectedLevel, newLevels);
        const onLowest = !_.isEmpty(data.lowestSelectedAddresses)
            && this.addressLevelService.minLevel() === data.lowestSelectedAddresses[0].level;
        return {
            data: data,
            onLowest: onLowest
        };
    }

    onSelect(levelType, selectedLevel, exclusive = false) {
        const newState = this.selectAddressLevel(this.state, levelType, selectedLevel, exclusive);
        this.setState(newState);
        this._invokeCallbacks(newState);
    }

    onLoad(lowestSelectedLevel) {
        const addressLevelState = this.defaultState();
        if (_.isNil(lowestSelectedLevel)) {
            return {data: addressLevelState};
        }
        const parentList = this.addressLevelService.getParentsOfLeaf(lowestSelectedLevel).concat([lowestSelectedLevel]);
        return parentList.reduce((acc, parent) =>
            this.selectAddressLevel(acc, parent.type, parent.uuid, true), {data: addressLevelState});
    }

    componentDidMount() {
        const selectedLowestLevel = this.props.selectedLowestLevel;
        const exists = !_.isEmpty(selectedLowestLevel) && !_.isEmpty(selectedLowestLevel.uuid);
        const newState = this.onLoad(exists ? selectedLowestLevel : undefined);
        this.setState(newState);
    }

    _invokeCallbacks(newState) {
        if (_.isFunction(this.props.onSelect)) {
            this.props.onSelect(newState.data.lowestSelectedAddresses);
        }
        if (newState.onLowest && _.isFunction(this.props.onLowestLevel)) {
            this.props.onLowestLevel(newState.data.lowestSelectedAddresses);
        }
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        let addressLevels = this.state.data.levels.map(([levelType, levels], idx) =>
            <AddressLevel
                mandatory={this.props.mandatory}
                onSelect={() => this._invokeCallbacks()}
                onToggle={(addressLevelUUID) => this.onSelect(levelType, addressLevelUUID, !this.props.multiSelect)}
                key={idx}
                validationError={this.props.validationError}
                levelType={levelType}
                multiSelect={this.props.multiSelect}
                levels={levels}/>);
        return (
            <View>
                {addressLevels}
            </View>
        );
    }
}

export default AddressLevels;