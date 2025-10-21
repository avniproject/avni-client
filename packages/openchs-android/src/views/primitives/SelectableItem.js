import PropTypes from "prop-types";
import {StyleSheet, Text, Image, TouchableWithoutFeedback} from "react-native";
import Colors from "./Colors";
import Styles from "./Styles";
import React from "react";
import Pressable from "react-native/Libraries/Components/Pressable/Pressable";
import MIcon from 'react-native-vector-icons/MaterialIcons';
import FIcon from 'react-native-vector-icons/FontAwesome';
import _ from 'lodash';
import {View} from 'native-base';
import MediaContent from "../common/MediaContent";

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

const CONTENT_WIDTH_WITH_MEDIA = '95%';
const CONTENT_WIDTH_WITHOUT_MEDIA = '85%';

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
        multiPadding: {flex: 0.05},
        padding: {},
        multiContent: {display: "flex", flex: 0.9, flexDirection: 'row', alignItems: 'center'},
        content: {flexDirection: 'row', alignItems: 'center'},
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
        const {value, checked, chunked, abnormal, style, validationResult, onPressed, disabled, currentLocale, multiSelect, displayText, hasMediaContent, media} = this.props;

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
        const additionalDetailsContainerStyle = (textColor === Colors.InputNormal) ? {} : {borderColor: textColor, borderWidth: 1};
        const renderStyle = chunked ? chunkedStyle : singleStyle;
        const isExtraHeightRequired = _.includes(['te_IN'], currentLocale);
        const extraLineHeight = isExtraHeightRequired ? {lineHeight: 20} : {};
        const onPress = () => onPressed(value);
        const iconColor = disabled ? Colors.DisabledButtonColor : Colors.AccentColor;
        const iconName = icons[multiSelect ? "checkbox" : "radio"][checked ? "checked" : "unchecked"];
        const backgroundColor = this.props.children ? Colors.GreyContentBackground : Colors.WhiteContentBackground;
        const additionalStylingForMedia = hasMediaContent ? { backgroundColor: Colors.GreyContentBackground, minHeight: 50, borderRadius: 5, padding: 2, marginVertical: 5, borderWidth: 1, borderColor: Colors.InputBorderNormal } : {};
        return (
            <Pressable onPress={onPress}
                       style={({pressed}) => [{backgroundColor: pressed ? 'red' : 'white'}, renderStyle.container, ]} disabled={disabled}>
                <MIcon.Button iconStyle={{marginLeft: -6}} name={iconName}
                              backgroundColor={backgroundColor}
                              color={iconColor} onPress={onPress} disabled={disabled}>
                    <View style={{marginLeft: -6, margin: hasMediaContent ? -10 : 0, flexDirection: 'column', width: hasMediaContent ? CONTENT_WIDTH_WITH_MEDIA : CONTENT_WIDTH_WITHOUT_MEDIA, overflow: 'hidden'}}>
                        {this.state.showAdditionalDetails ? <View style={additionalDetailsContainerStyle}>{this.props.children}</View> :
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...additionalStylingForMedia }}>
                                <Text style={[Styles.formBodyText, { color: textColor, fontSize: 16, flex: 0.95 }, extraLineHeight]}>
                                    {displayText}
                                </Text>
                                {hasMediaContent && <View style={{marginLeft: 'auto', paddingLeft: 10}}>
                                    <MediaContent media={media || []} size={30} />
                                </View>}
                            </View>}
                    </View>
                    {this.props.children && <FIcon.Button name={this.state.showAdditionalDetails ? "caret-up" : "caret-down"} size={18}
                                                          backgroundColor={Colors.FilterButtonColor}
                                                          borderRadius={10} color={Colors.AccentColor}
                                                          iconStyle={{marginTop: -2, marginRight: 0}}
                                                          onPress={this.toggleAdditionalDetailsDisplay}/>}
                </MIcon.Button>
            </Pressable>
        );
    }
}

export default SelectableItem;
