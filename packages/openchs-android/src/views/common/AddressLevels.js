import React from "react";
import _ from 'lodash';
import {View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import AddressLevel from "./AddressLevel";
import AddressLevelService from "../../service/AddressLevelService";
import AddressLevelsState from "../../action/common/AddressLevelsState";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import {Text} from "native-base";

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool,
        onSelect: React.PropTypes.func,
        onLowestLevel: React.PropTypes.func,
        validationError: React.PropTypes.object,
        mandatory: React.PropTypes.bool,
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
        const newLevels = this.addressLevelService.getDescendantsOfParent(selectedLevelUUID);
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
        const oldState = this.state;
        this.setState(newState);
        this._invokeCallbacks(oldState, newState);
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

    componentWillMount() {
        const selectedLowestLevel = this.props.selectedLowestLevel;
        const exists = !_.isEmpty(selectedLowestLevel) && !_.isEmpty(selectedLowestLevel.uuid);
        const newState = this.onLoad(exists ? selectedLowestLevel : undefined);
        this.setState(newState);
    }

    _invokeCallbacks(oldState, newState) {
        if (_.isFunction(this.props.onSelect)) {
            this.props.onSelect(newState.data.lowestSelectedAddresses);
        }
        if ((oldState.onLowest || newState.onLowest) && _.isFunction(this.props.onLowestLevel)) {
            this.props.onLowestLevel(newState.data.lowestSelectedAddresses);
        }
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const mandatoryText = this.props.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        let addressLevels = this.state.data.levels.map(([levelType, levels], idx) =>
            <AddressLevel
                onToggle={(addressLevelUUID) => this.onSelect(levelType, addressLevelUUID, !this.props.multiSelect)}
                key={idx}
                validationError={this.props.validationError}
                levelType={levelType}
                multiSelect={this.props.multiSelect}
                levels={levels}/>);
        return (
            <View key={this.props.key} style={{
                marginTop: Styles.VerticalSpacingBetweenFormElements,
                marginBottom: Styles.VerticalSpacingBetweenFormElements,
            }}>
                <Text style={Styles.formLabel}>{this.I18n.t('Address')}{mandatoryText}</Text>
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                    // paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
                }}>
                    {addressLevels}
                </View>
            </View>
        );
    }
}

export default AddressLevels;