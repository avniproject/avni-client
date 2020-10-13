import PropTypes from 'prop-types';
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
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import LocationHierarchyService from "../../service/LocationHierarchyService";

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: PropTypes.bool,
        onSelect: PropTypes.func,
        onLowestLevel: PropTypes.func,
        validationError: PropTypes.object,
        mandatory: PropTypes.bool,
        addressLevelState: PropTypes.object,
        skipLabel: PropTypes.bool,
        minLevelTypeUUIDs: PropTypes.array,
        maxLevelTypeUUID: PropTypes.string,
        isOutsideCatchment: PropTypes.bool
    };

    viewName() {
        return 'AddressLevels';
    }

    constructor(props, context) {
        super(props, context);
        this.addressLevelService = context.getService(this.props.isOutsideCatchment ? LocationHierarchyService : AddressLevelService);
    }

    defaultState() {
        if (_.isNil(this.props.maxLevelTypeUUID)) {
            const highestAddressLevels = this.addressLevelService.highestLevel();
            return new AddressLevelsState(highestAddressLevels);
        } else {
            return new AddressLevelsState(this.addressLevelService.getAllWithTypeUUID(this.props.maxLevelTypeUUID))
        }
    }

    selectAddressLevel(state, levelType, selectedLevelUUID, exclusive = false) {
        const selectedLevel = this.addressLevelService.findByUUID(selectedLevelUUID, this.addressLevelService.getSchema());
        const newLevels = _.includes(this.props.minLevelTypeUUIDs, selectedLevel.typeUuid) ? [] : this.addressLevelService.getDescendantsOfParent(selectedLevelUUID, this.props.minLevelTypeUUIDs);
        const data = exclusive ? state.data.selectLevel(levelType, selectedLevel, newLevels) :
            state.data.addLevel(levelType, selectedLevel, newLevels);
        const onLowest = !_.isEmpty(data.lowestSelectedAddresses)
            && this.addressLevelService.isOnLowestLevel(data.lowestSelectedAddresses, this.props.minLevelTypeUUIDs);
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
        const parentList = this.addressLevelService.getParentsOfLeaf(lowestSelectedLevel, this.props.maxLevelTypeUUID).concat([lowestSelectedLevel]);
        return parentList.reduce((acc, parent) =>
            this.selectAddressLevel(acc, parent.type, parent.uuid, true), {data: addressLevelState});
    }

    componentWillMount() {
        if (this.props.addressLevelState && this.props.multiSelect) {
            if (this.props.addressLevelState.selectedAddresses.length > 0) {
                const onLowest = !_.isEmpty(this.props.addressLevelState.lowestSelectedAddresses)
                    && this.addressLevelService.isOnLowestLevel(this.props.addressLevelState.lowestSelectedAddresses);
                this.setState({
                    data: this.props.addressLevelState,
                    onLowest: onLowest
                });
                return;
            }
            this.setState(this.onLoad());
        } else {
            this.setState({data: new AddressLevelsState()}, () => {
                const selectedLowestLevel = this.props.selectedLowestLevel;
                const exists = !_.isEmpty(selectedLowestLevel) && !_.isEmpty(selectedLowestLevel.uuid);
                const newState = this.onLoad(exists ? selectedLowestLevel : undefined);
                this.setState(newState);
            });
        }
    }

    _invokeCallbacks(oldState, newState) {
        if (_.isFunction(this.props.onSelect)) {
            this.props.onSelect(newState.data);
        }
        if (_.isFunction(this.props.onLowestLevel)) {
            this.props.onLowestLevel(newState.onLowest ? newState.data.lowestSelectedAddresses : []);
        }
    }

    render() {
        if (!this.props) return null;

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
            <View style={{
                marginTop: Styles.VerticalSpacingBetweenFormElements,
                marginBottom: Styles.VerticalSpacingBetweenFormElements,
            }}>
                {this.props.skipLabel ? null :
                    <Text style={Styles.formLabel}>{this.I18n.t('Address')}{mandatoryText}</Text>}
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderRadius: 1,
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                    // paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
                }}>
                    {addressLevels}
                </View>
                <View style={{backgroundColor: '#ffffff'}}>
                    <ValidationErrorMessage validationResult={this.props.validationError}/>
                </View>
            </View>
        );
    }
}

export default AddressLevels;
