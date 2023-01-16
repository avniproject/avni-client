import {Text, TouchableOpacity, View, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Checkbox, Radio} from "native-base";
import Colors from '../primitives/Colors';
import _ from 'lodash';
import Styles from "./Styles";
import UserInfoService from "../../service/UserInfoService";

class PresetOptionItem extends AbstractComponent {
    static defaultProps = {
        chunked: false,
        disabled: false,
    };

    static propTypes = {
        multiSelect: PropTypes.bool.isRequired,
        checked: PropTypes.bool.isRequired,
        displayText: PropTypes.string.isRequired,
        validationResult: PropTypes.object,
        abnormal: PropTypes.bool,
        style: PropTypes.object,
        chunked: PropTypes.bool,
        value: PropTypes.any,
        radioItemPressed: PropTypes.func
    };

    static styles = StyleSheet.create({
        multiPadding: {flex: 0.05},
        padding: {},
        multiContent: {flex: 0.9, flexDirection: 'row', alignItems: 'center'},
        content: {flexDirection: 'row', alignItems: 'center'},
    });

    constructor(props, context) {
        super(props, context);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext): boolean {
        if (this.props.checked !== nextProps.checked) return true;
        return (this.props.displayText !== nextProps.displayText) ||
            (_.isNil(this.props.validationResult) !== _.isNil(nextProps.validationResult)) ||
            (this.props.abnormal !== nextProps.abnormal);
    }

    getSelectComponent(defaultColor, extraLineHeight, onRadioItemPress) {
        const {disabled, multiSelect, value, displayText} = this.props;
        const color = disabled ? Colors.DisabledButtonColor : Colors.AccentColor;
        const SelectComponent = multiSelect ? Checkbox : Radio;
        return <SelectComponent disabled={disabled} value={value} color={color} onPress={onRadioItemPress}>
            <Text style={[Styles.formBodyText, {color: defaultColor}, extraLineHeight]} onPress={onRadioItemPress}>
                {displayText}
            </Text>
        </SelectComponent>;
    }

    render() {
        const {value, checked, chunked, abnormal, style, validationResult, radioItemPressed, disabled} = this.props;

        const color = _.isNil(validationResult)
            ? checked && abnormal
                ? Colors.AbnormalValueHighlight
                : Colors.InputNormal
            : Colors.ValidationError;
        const chunkedStyle = {
            content: PresetOptionItem.styles.multiContent,
            container: [style, {flex: 1}]
        };
        const singleStyle = {
            content: PresetOptionItem.styles.content,
            container: style
        };
        const ToRender = chunked ? chunkedStyle : singleStyle;
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        const isExtraHeightRequired = _.includes(['te_IN'], currentLocale);
        const extraLineHeight = isExtraHeightRequired ? {lineHeight: 20} : {};
        const onRadioItemPress = _.isNil(radioItemPressed) ? null : () => radioItemPressed(value);
        return (
            <TouchableOpacity style={ToRender.container} disabled={disabled} onPress={onRadioItemPress}>
                {this.getSelectComponent(color, extraLineHeight, onRadioItemPress)}
            </TouchableOpacity>
        );
    }
}

export default PresetOptionItem;
