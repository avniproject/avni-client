import PropTypes from "prop-types";
import {StyleSheet, Text, TouchableOpacity} from "react-native";
import Colors from "./Colors";
import Styles from "./Styles";
import React from "react";
import Pressable from "react-native/Libraries/Components/Pressable/Pressable";
import Icon from 'react-native-vector-icons/MaterialIcons';
import _ from 'lodash';

const icons = {
    "radio": {
        "checked": "radio-button-on",
        "unchecked": "radio-button-off"
    },
    "checkbox": {
        "checked": "check-box",
        "unchecked": "check-box-outline-blank"
    }
}

class SelectableItem extends React.Component {
    static defaultProps = {
        chunked: false,
        disabled: false,
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
        disabled: PropTypes.bool
    };

    static styles = StyleSheet.create({
        multiPadding: {flex: 0.05},
        padding: {},
        multiContent: {display: "flex", flex: 0.9, flexDirection: 'row', alignItems: 'center'},
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

    render() {
        const {value, checked, chunked, abnormal, style, validationResult, onPressed, disabled, currentLocale, multiSelect, displayText} = this.props;

        const textColor = _.isNil(validationResult)
            ? checked && abnormal
                ? Colors.AbnormalValueHighlight
                : Colors.InputNormal
            : Colors.ValidationError;
        const chunkedStyle = {
            content: SelectableItem.styles.multiContent,
            container: [style]
        };
        const singleStyle = {
            content: SelectableItem.styles.content,
            container: [style]
        };
        const renderStyle = chunked ? chunkedStyle : singleStyle;
        const isExtraHeightRequired = _.includes(['te_IN'], currentLocale);
        const extraLineHeight = isExtraHeightRequired ? {lineHeight: 20} : {};
        const onPress = () => onPressed(value);
        const iconColor = disabled ? Colors.DisabledButtonColor : Colors.AccentColor;
        const iconName = icons[multiSelect ? "checkbox" : "radio"][checked ? "checked" : "unchecked"];
        return (
            <Pressable onPress={onPress}
                       style={({pressed}) => [{backgroundColor: pressed ? 'red' : 'white'}, renderStyle.container]} disabled={disabled}>
                <Icon.Button iconStyle={{marginLeft: -10}} name={iconName} backgroundColor="white" color={iconColor} onPress={onPress} disabled={disabled}>
                    <Text style={[Styles.formBodyText, {color: textColor, fontSize: 16, flex: 0.95}, extraLineHeight]}>
                        {displayText}
                    </Text>
                </Icon.Button>
            </Pressable>
        );
    }
}

export default SelectableItem;
