import PropTypes from "prop-types";
import {StyleSheet, Text, TouchableOpacity} from "react-native";
import Colors from "./Colors";
import Styles from "./Styles";
import React from "react";
import Pressable from "react-native/Libraries/Components/Pressable/Pressable";
import FIcon from 'react-native-vector-icons/FontAwesome';
import _ from 'lodash';
import {View} from 'native-base';
import MediaContent from "../common/MediaContent";

class SelectableItem extends React.Component {
    static defaultProps = {
        chunked: false,
        disabled: false,
        hasMediaContent: false,
    };

    static propTypes = {
        multiSelect: PropTypes.bool.isRequired,
        checked: PropTypes.bool.isRequired,
        displayText: PropTypes.string.isRequired,
        onPressed: PropTypes.func.isRequired,
        validationResult: PropTypes.object,
        abnormal: PropTypes.bool,
        style: PropTypes.object,
        chunked: PropTypes.bool,
        value: PropTypes.any,
        currentLocale: PropTypes.string,
        disabled: PropTypes.bool,
        media: PropTypes.array,
        hasMediaContent: PropTypes.bool
    };

    static styles = StyleSheet.create({
        pill: {
            alignSelf: 'stretch',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 16,
        },
        content: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    });

    constructor(props, context) {
        super(props, context);
        this.state = {
            showAdditionalDetails: false
        };
        this.toggleAdditionalDetailsDisplay = this.toggleAdditionalDetailsDisplay.bind(this)
    }

    toggleAdditionalDetailsDisplay() {
        this.setState((state) => ({showAdditionalDetails: !state.showAdditionalDetails}));
    }

    shouldComponentUpdate(nextProps, nextState, nextContext): boolean {
        if (this.props.checked !== nextProps.checked) return true;
        if (this.state.showAdditionalDetails !== nextState.showAdditionalDetails) return true;
        return (this.props.displayText !== nextProps.displayText) ||
            (_.isNil(this.props.validationResult) !== _.isNil(nextProps.validationResult)) ||
            (this.props.abnormal !== nextProps.abnormal);
    }

    render() {
        const {checked, abnormal, style, validationResult, onPressed, disabled, currentLocale, displayText, hasMediaContent, media, value} = this.props;

        const hasError = !_.isNil(validationResult);
        const isAbnormalChecked = checked && abnormal;

        const backgroundColor = disabled
            ? Colors.DisabledButtonColor
            : checked
                ? (isAbnormalChecked ? Colors.AbnormalValueHighlight : Colors.ActionButtonColor)
                : Colors.BrandLight;
        const borderWidth = hasError ? 1.5 : 0;
        const borderColor = hasError ? Colors.ValidationError : 'transparent';
        const textColor = hasError
            ? Colors.ValidationError
            : disabled
                ? Colors.InputNormal
                : checked
                    ? Colors.TextOnPrimaryColor
                    : Colors.BrandPrimary;

        const additionalDetailsContainerStyle = hasError ? {borderColor: textColor, borderWidth: 1} : {};
        const isExtraHeightRequired = _.includes(['te_IN'], currentLocale);
        const extraLineHeight = isExtraHeightRequired ? {lineHeight: 20} : {};
        const onPress = () => onPressed(value);

        return (
            <Pressable onPress={onPress}
                       style={({pressed}) => [style, pressed && !disabled ? {opacity: 0.8} : {}]}
                       disabled={disabled}>
                <View style={[SelectableItem.styles.pill, {backgroundColor, borderColor, borderWidth}]}>
                    {this.state.showAdditionalDetails ? <View style={additionalDetailsContainerStyle}>{this.props.children}</View> :
                        <View style={SelectableItem.styles.content}>
                            <Text style={[Styles.formBodyText, {color: textColor, fontSize: 16, flex: 1}, extraLineHeight]}>
                                {displayText}
                            </Text>
                            {hasMediaContent && <View style={{marginLeft: 10}}>
                                <MediaContent media={media || []} size={56} round={true}/>
                            </View>}
                            {this.props.children &&
                            <TouchableOpacity onPress={this.toggleAdditionalDetailsDisplay} style={{marginLeft: 8}}>
                                <FIcon name={this.state.showAdditionalDetails ? "caret-up" : "caret-down"} size={18}
                                       color={textColor}/>
                            </TouchableOpacity>}
                        </View>}
                </View>
            </Pressable>
        );
    }
}

export default SelectableItem;
