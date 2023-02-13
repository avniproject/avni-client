import {StyleSheet, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Text} from "native-base";
import Colors from '../primitives/Colors';
import Distances from "./Distances";
import Styles from "./Styles";
import _ from 'lodash';
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import SelectableItem from "./SelectableItem";

class SelectableItemGroup extends React.Component {
    static defaultProps = {
        style: {},
        borderStyle: {},
        inPairs: false,
        multiSelect: false,
        disabled: false,
        skipLabel: false,
        allowUnselect: true
    };

    static propTypes = {
        onPress: PropTypes.func.isRequired,
        labelKey: PropTypes.string.isRequired,
        labelValuePairs: PropTypes.array.isRequired,
        selectionFn: PropTypes.func.isRequired,
        I18n: PropTypes.object.isRequired,
        validationError: PropTypes.object,
        style: PropTypes.object,
        borderStyle: PropTypes.object,
        mandatory: PropTypes.bool,
        inPairs: PropTypes.bool,
        multiSelect: PropTypes.bool,
        skipLabel: PropTypes.bool,
        allowUnselect: PropTypes.bool,
        locale: PropTypes.string.isRequired,
        disabled: PropTypes.bool
    };

    onItemPressed(value, checked, label) {
        if (checked && !this.props.allowUnselect) return;
        this.props.onPress(value, label);
    }

    renderPairedOptions() {
        const {labelValuePairs, I18n, validationError, disabled, selectionFn, multiSelect, locale} = this.props;
        return _.chunk(labelValuePairs, 2).map((rlvPair, idx) =>
            <View style={{flexDirection: "row", display: "flex"}} key={idx}>
                {rlvPair.map((radioLabelValue) => {
                        const checked = selectionFn(radioLabelValue.value);
                        return <View style={{flex: 0.5, display: "flex", paddingHorizontal: 2}}
                                     key={radioLabelValue.label}>
                            <SelectableItem displayText={I18n.t(radioLabelValue.label)}
                                            checked={checked}
                                            abnormal={radioLabelValue.abnormal}
                                            multiSelect={multiSelect}
                                            chunked={true}
                                            validationResult={validationError}
                                            currentLocale={locale}
                                            style={{
                                                justifyContent: "center"
                                            }}
                                            disabled={disabled}
                                            value={radioLabelValue.value}
                                            onPressed={(value) => this.onItemPressed(value, checked, radioLabelValue.label)}/>
                        </View>;
                    }
                )}
            </View>);
    }

    renderOptions() {
        const {labelValuePairs, I18n, validationError, disabled, selectionFn, multiSelect, locale} = this.props;
        return labelValuePairs.map(radioLabelValue => {
            const checked = selectionFn(radioLabelValue.value);
            return <SelectableItem displayText={I18n.t(radioLabelValue.label)}
                                   checked={checked}
                                   multiSelect={multiSelect}
                                   abnormal={radioLabelValue.abnormal}
                                   validationResult={validationError}
                                   key={radioLabelValue.label}
                                   currentLocale={locale}
                                   style={{
                                       paddingHorizontal: Distances.HorizontalSpacingBetweenOptionItems,
                                       justifyContent: "center"
                                   }}
                                   disabled={disabled}
                                   value={radioLabelValue.value}
                                   onPressed={(value) => this.onItemPressed(value, checked, radioLabelValue.label)}
            />;
        });
    }

    renderSingleValue() {
        const radioLabelValue = _.head(this.props.labelValuePairs);
        if (!this.props.selectionFn(radioLabelValue.value)) {
            this.props.onPress(radioLabelValue.value, radioLabelValue.label);
        }
        return (
            <Text style={Styles.formLabel}>{radioLabelValue.label}</Text>
        )
    }

    render() {
        const {mandatory, labelValuePairs, skipLabel, labelKey, borderStyle, inPairs, validationError} = this.props;
        const mandatoryText = mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;

        return (
            <View>
                {!skipLabel &&
                <Text style={Styles.formLabel}>{this.props.I18n.t(labelKey)}{mandatoryText}</Text>}
                {labelValuePairs.length > 0 ? labelValuePairs.length === 1 && mandatory === true ?
                    <View style={[style.radioStyle, borderStyle]}>
                        {this.renderSingleValue()}
                    </View> :
                    <View accessibilityLabel={labelKey} style={[style.radioStyle, borderStyle]}>
                        {inPairs ? this.renderPairedOptions() : this.renderOptions()}
                    </View>
                    : <View/>}
                <View style={{backgroundColor: '#ffffff'}}>
                    <ValidationErrorMessage validationResult={validationError}/>
                </View>
            </View>
        );
    }
}

export default SelectableItemGroup;
const style = StyleSheet.create({
    radioStyle: {
        borderWidth: 1,
        borderRadius: 1,
        borderStyle: 'dashed',
        borderColor: Colors.InputBorderNormal,
        paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
    }
})
