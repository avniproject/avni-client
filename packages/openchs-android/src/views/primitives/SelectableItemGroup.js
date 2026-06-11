import {StyleSheet, TextInput, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Text} from "native-base";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from '../primitives/Colors';
import Distances from "./Distances";
import Styles from "./Styles";
import _ from 'lodash';
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import SelectableItem from "./SelectableItem";
import SubjectInfoCard from '../common/SubjectInfoCard';
import MediaContent from '../common/MediaContent';
import AnyChip from './AnyChip';

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
        hasMediaContent: PropTypes.bool,
        headerChipLabel: PropTypes.string,
        headerChipActive: PropTypes.bool,
        onHeaderChipPress: PropTypes.func,
        searchThreshold: PropTypes.number,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {searchQuery: ''};
    }

    onItemPressed(value, checked, label) {
        if (checked && !this.props.allowUnselect) return;
        this.props.onPress(value, label);
    }

    getFilteredLabelValuePairs() {
        const {labelValuePairs, I18n} = this.props;
        const query = this.state.searchQuery.trim();
        if (_.isEmpty(query)) return labelValuePairs;
        const tokenMatchers = query.split(/[ \-:]+/).filter(Boolean).map(token => new RegExp(_.escapeRegExp(token), 'i'));
        return labelValuePairs.filter(rlv => {
            const english = rlv.label || '';
            const translated = I18n.t(rlv.label) || '';
            return _.every(tokenMatchers, matcher => matcher.test(english) || matcher.test(translated));
        });
    }

    renderSearchBox() {
        const {I18n} = this.props;
        const {searchQuery} = this.state;
        return (
            <View style={style.searchContainer}>
                <Icon name="magnify" size={20} color={Colors.SecondaryText} style={{marginRight: 8}}/>
                <TextInput style={style.searchInput}
                           placeholder={I18n.t('searchByTyping')}
                           placeholderTextColor={Colors.SecondaryText}
                           underlineColorAndroid="transparent"
                           value={searchQuery}
                           onChangeText={(text) => this.setState({searchQuery: text})}/>
                {searchQuery.length > 0 &&
                    <TouchableOpacity onPress={() => this.setState({searchQuery: ''})}>
                        <Icon name="close-circle" size={20} color={Colors.SecondaryText}/>
                    </TouchableOpacity>}
            </View>
        );
    }

    renderPairedOptions(labelValuePairs) {
        const {I18n, validationError, disabled, selectionFn, multiSelect, locale} = this.props;
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

    renderOptions(labelValuePairs) {
        const {I18n, validationError, disabled, selectionFn, multiSelect, locale, hasMediaContent} = this.props;
        return labelValuePairs.map(radioLabelValue => {
            const checked = selectionFn(radioLabelValue.value) || false;
            const individual = radioLabelValue.subject;
            const media = radioLabelValue.media || [];
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
                                   media={media}
                                   hasMediaContent={hasMediaContent}
                                   onPressed={(value) => this.onItemPressed(value, checked, radioLabelValue.label)}
            >
                {individual && <SubjectInfoCard individual={individual} hideEnrolments={false}/>}
            </SelectableItem>;
        });
    }

    renderSingleValue() {
        const radioLabelValue = _.head(this.props.labelValuePairs);
        const media = radioLabelValue.media || [];
        if (!this.props.selectionFn(radioLabelValue.value)) {
            this.props.onPress(radioLabelValue.value, radioLabelValue.label);
        }
        return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={Styles.formLabel}>{this.props.I18n.t(radioLabelValue.label)}</Text>
            {media.length > 0 && <MediaContent media={media} size={64}/>}
        </View>
        )
    }

    render() {
        const {mandatory, labelValuePairs, skipLabel, labelKey, borderStyle, inPairs, validationError, headerChipLabel, headerChipActive, onHeaderChipPress, searchThreshold} = this.props;
        const mandatoryText = mandatory ? <Text style={{color: Colors.ValidationError}}> * </Text> : <Text/>;
        const showHeaderChip = !!headerChipLabel && _.isFunction(onHeaderChipPress);
        const showSearch = labelValuePairs.length > searchThreshold;
        const visiblePairs = showSearch ? this.getFilteredLabelValuePairs() : labelValuePairs;
        return (
            <View>
                {!skipLabel &&
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Text style={Styles.formLabel}>{this.props.I18n.t(labelKey)}{mandatoryText}</Text>
                    {showHeaderChip &&
                        <AnyChip label={headerChipLabel} active={!!headerChipActive} onPress={onHeaderChipPress}/>}
                </View>}
                {showSearch && this.renderSearchBox()}
                {labelValuePairs.length === 1 && mandatory === true ?
                    <View style={[style.radioStyle, borderStyle]}>
                        {this.renderSingleValue()}
                    </View> :
                    visiblePairs.length > 0 ?
                    <View accessibilityLabel={labelKey} style={[style.radioStyle, borderStyle]}>
                        {inPairs ? this.renderPairedOptions(visiblePairs) : this.renderOptions(visiblePairs)}
                    </View> :
                    showSearch ?
                    <View style={[style.radioStyle, borderStyle]}>
                        <Text style={style.noResultText}>{this.props.I18n.t('zeroNumberOfResults')}</Text>
                    </View> :
                    <View/>}
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
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 6,
        backgroundColor: Colors.cardBackgroundColor,
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 6,
        color: Colors.InputNormal,
    },
    noResultText: {
        padding: 12,
        textAlign: 'center',
        color: Colors.SecondaryText,
    },
})
