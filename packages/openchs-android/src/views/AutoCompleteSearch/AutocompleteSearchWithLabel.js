import React from 'react'
import AbstractComponent from "../../framework/view/AbstractComponent";
import {View} from 'react-native';
import {Text} from "native-base";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Distances from "../primitives/Distances";
import PropTypes from "prop-types";
import _ from 'lodash';
import AutocompleteSearch from "./AutocompleteSearch";
import AnyChip from "../primitives/AnyChip";

class AutocompleteSearchWithLabel extends AbstractComponent {
    static propTypes = {
        options: PropTypes.array.isRequired,
        labelKey: PropTypes.string.isRequired,
        onSelectedItemChange: PropTypes.func.isRequired,
        selectionFn: PropTypes.func.isRequired,
        multiSelect: PropTypes.bool,
        mandatory: PropTypes.bool,
        uniqueKey: PropTypes.string,
        displayKey: PropTypes.string,
        headerChipLabel: PropTypes.string,
        headerChipActive: PropTypes.bool,
        onHeaderChipPress: PropTypes.func,
    };

    static defaultProps = {
        isMulti: false,
        selectedItems: [],
        displayKey: 'name',
        uniqueKey: 'uuid'
    };

    render() {
        const mandatoryText = this.props.mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        const {options, uniqueKey, selectionFn, labelKey, multiSelect, displayKey, onSelectedItemChange, headerChipLabel, headerChipActive, onHeaderChipPress} = this.props;
        const selectedKeys = _.filter(options, (option) => selectionFn(option)).map(option => option[uniqueKey]);
        const showHeaderChip = !!headerChipLabel && _.isFunction(onHeaderChipPress);
        return (
            <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Text style={Styles.formLabel}>{this.I18n.t(labelKey)}{mandatoryText}</Text>
                    {showHeaderChip &&
                        <AnyChip label={headerChipLabel} active={!!headerChipActive} onPress={onHeaderChipPress}/>}
                </View>
                <View style={{
                    padding: Distances.ScaledVerticalSpacingBetweenOptionItems,
                    marginBottom: 5
                }}>
                    <AutocompleteSearch
                        isMulti={multiSelect}
                        items={options}
                        uniqueKey={uniqueKey}
                        displayKey={displayKey}
                        onSelectedItemsChange={(uniqueKeyValue) => onSelectedItemChange(uniqueKeyValue)}
                        selectedItems={selectedKeys}
                    />
                </View>
            </View>
        );
    }
}

export default AutocompleteSearchWithLabel;
