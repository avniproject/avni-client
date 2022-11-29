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

    getSelectComponent(defaultColor, extraLineHeight) {
        const {disabled, multiSelect, value, radioItemPressed, displayText} = this.props;
        const onRadioItemPress = () => radioItemPressed(value);
        const color = disabled ? Colors.DisabledButtonColor : Colors.AccentColor;
        const SelectComponent = multiSelect ? Checkbox : Radio;
        return <SelectComponent disabled={disabled} value={value} color={color} onPress={onRadioItemPress}>
            <Text style={[Styles.formBodyText, {color: defaultColor}, extraLineHeight]} onPress={onRadioItemPress}>
                {displayText}
            </Text>
        </SelectComponent>;
    }

    shouldComponentUpdate(nextProps) {
        return (
            this.props.checked !== nextProps.checked ||
            _.isNil(this.props.validationResult) !==
            _.isNil(nextProps.validationResult)
        );
    }

    render() {
        const color = _.isNil(this.props.validationResult)
            ? this.props.checked && this.props.abnormal
                ? Colors.AbnormalValueHighlight
                : Colors.InputNormal
            : Colors.ValidationError;
        const chunked = {
            content: PresetOptionItem.styles.multiContent,
            container: [this.props.style, {flex: 1}]
        };
        const single = {
            content: PresetOptionItem.styles.content,
            container: this.props.style
        };
        const ToRender = this.props.chunked ? chunked : single;
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        const isExtraHeightRequired = _.includes(['te_IN'], currentLocale);
        const extraLineHeight = isExtraHeightRequired ? {lineHeight: 20} : {};
        return (
            <TouchableOpacity style={ToRender.container} disabled={this.props.disabled} onPress={() => this.props.radioItemPressed(value)}>
                {this.getSelectComponent(color, extraLineHeight)}
            </TouchableOpacity>
        );
    }
}

export default PresetOptionItem;
