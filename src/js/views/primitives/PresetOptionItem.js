import {Text, TouchableOpacity, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {CheckBox, Radio} from "native-base";
import Colors from '../primitives/Colors';
import _ from 'lodash';
import Styles from "./Styles";
import themes from "./themes"

class PresetOptionItem extends AbstractComponent {
    static inputTextStyle = {marginLeft: 11, color: Colors.InputNormal};

    static propTypes = {
        multiSelect: React.PropTypes.bool.isRequired,
        checked: React.PropTypes.bool.isRequired,
        onPress: React.PropTypes.func,
        displayText: React.PropTypes.string.isRequired,
        validationResult: React.PropTypes.object,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const color = _.isNil(this.props.validationResult) ? Colors.InputNormal : Colors.ValidationError;
        const appendedStyle = this.appendedStyle({flexDirection: 'row', alignItems: 'center'});
        return (
            <TouchableOpacity onPress={() => this.props.onPress()} style={this.props.style}>
                <View style={appendedStyle}>
                    {this.getSelectComponent()}
                    <Text
                        style={[Styles.formBodyText, PresetOptionItem.inputTextStyle, {color: color}]}>{this.props.displayText}</Text>
                </View>
            </TouchableOpacity>
        );
    }

    getSelectComponent() {
        if (this.props.multiSelect)
            return (<CheckBox theme={themes} checked={this.props.checked}
                              onPress={() => this.props.onPress()}/>);
        else
            return (<Radio theme={themes} selected={this.props.checked}
                           onPress={() => this.props.onPress()}/>);
    }
}

export default PresetOptionItem;