import {Text, TouchableOpacity, View, StyleSheet} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {CheckBox, Radio} from "native-base";
import Colors from '../primitives/Colors';
import _ from 'lodash';
import Styles from "./Styles";
import themes from "./themes"
import General from "../../utility/General";

class PresetOptionItem extends AbstractComponent {
    static inputTextStyle = {marginLeft: 11, color: Colors.InputNormal};

    static defaultProps = {
        chunked: false
    };

    static propTypes = {
        multiSelect: React.PropTypes.bool.isRequired,
        checked: React.PropTypes.bool.isRequired,
        onPress: React.PropTypes.func,
        displayText: React.PropTypes.string.isRequired,
        validationResult: React.PropTypes.object,
        abnormal: React.PropTypes.bool,
        style: React.PropTypes.object,
        chunked: React.PropTypes.bool
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

    getSelectComponent() {
        if (this.props.multiSelect)
            return (<CheckBox theme={themes} checked={this.props.checked}
                              onPress={() => this.props.onPress()}/>);
        else
            return (<Radio theme={themes} selected={this.props.checked}
                           onPress={() => this.props.onPress()}/>);
    }

    shouldComponentUpdate(nextProps) {
        return (
            this.props.checked !== nextProps.checked ||
            _.isNil(this.props.validationResult) !==
            _.isNil(nextProps.validationResult)
        );
    }

    render() {
        General.logDebug("PresetOptionItem", "render");
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
        return (
            <TouchableOpacity onPress={() => this.props.onPress()} style={ToRender.container}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'flex-start'}}>
                    <View>
                        {this.getSelectComponent()}
                    </View>
                    <Text style={[Styles.formBodyText, PresetOptionItem.inputTextStyle, {color: color}]}>
                        {this.props.displayText}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }
}

export default PresetOptionItem;