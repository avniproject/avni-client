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
import SubjectInfoCard from '../common/SubjectInfoCard';
import MediaContent from '../common/MediaContent';

class SelectableItemGroup extends React.Component {
    static defaultProps = {
        style: {},
        borderStyle: {},
        inPairs: false,
        multiSelect: false,
        disabled: false,
        skipLabel: false,
        allowUnselect: true,
        hasMediaContent: false
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
        disabled: PropTypes.bool,
        hasMediaContent: PropTypes.bool
    };

    onItemPressed(value, checked, label) {
        if (checked && !this.props.allowUnselect) return;
        this.props.onPress(value, label);
    }

    renderPairedOptions() {
        const {labelValuePairs, I18n, validationError, disabled, selectionFn, multiSelect, locale} = this.props;
        return _.chunk(labelValuePairs, 2).map((rlvPair, idx) =>
            <View style={{flexDirection: "row", display: "flex"}} key={idx}>
                {rlvPair.map((radioLabelValue, index) => {
                        const checked = selectionFn(radioLabelValue.value) || false;
                        return <View style={{flex: 0.5, display: "flex", paddingHorizontal: 2}}
                                     key={radioLabelValue.label + index}>
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
        const {labelValuePairs, I18n, validationError, disabled, selectionFn, multiSelect, locale, hasMediaContent} = this.props;
        return labelValuePairs.map(radioLabelValue => {
            const checked = selectionFn(radioLabelValue.value) || false;
            const individual = radioLabelValue.subject;
            const mediaType = radioLabelValue.mediaType;
            const mediaUrl = radioLabelValue.mediaUrl;
            return <SelectableItem displayText={I18n.t(radioLabelValue.label)}
                                   checked={checked}
                                   multiSelect={multiSelect}
                                   abnormal={radioLabelValue.abnormal}
                                   validationResult={validationError}
                                   key={radioLabelValue.label}
                                   currentLocale={locale}
                                   style={{
                                       paddingHorizontal: Distances.HorizontalSmallSpacingBetweenOptionItems,
                                       paddingVertical: Distances.VerticalSmallSpacingBetweenOptionItems,
                                       justifyContent: "center"
                                   }}
                                   disabled={disabled}
                                   value={radioLabelValue.value}
                                   mediaType={mediaType}
                                   mediaUrl={mediaUrl}
                                   hasMediaContent={hasMediaContent}
                                   onPressed={(value) => this.onItemPressed(value, checked, radioLabelValue.label)}
            >
                {individual && <SubjectInfoCard individual={individual} hideEnrolments={false}/>}
            </SelectableItem>;
        });
    }

    renderSingleValue() {
        const radioLabelValue = _.head(this.props.labelValuePairs);
        const mediaType = radioLabelValue.mediaType;
        const mediaUrl = radioLabelValue.mediaUrl;
        if (!this.props.selectionFn(radioLabelValue.value)) {
            this.props.onPress(radioLabelValue.value, radioLabelValue.label);
        }
        return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={Styles.formLabel}>{this.props.I18n.t(radioLabelValue.label)}</Text>
            {mediaType && mediaUrl && <MediaContent mediaType={mediaType} mediaUrl={mediaUrl} />}
        </View>
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
