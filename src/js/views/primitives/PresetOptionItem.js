import {Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {CheckBox, Radio} from "native-base";
import Fonts from '../primitives/Fonts';
import Colors from '../primitives/Colors';
import _ from 'lodash';
import General from "../../utility/General";

class PresetOptionItem extends AbstractComponent {
    static inputTextStyle = {fontSize: Fonts.Large, marginLeft: 11, color: Colors.InputNormal};

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
            <View style={appendedStyle}>
                {this.getSelectComponent()}
                <Text style={[PresetOptionItem.inputTextStyle, {color: color}]} onPress={() => this.props.onPress()}>{this.props.displayText}</Text>
            </View>
        );
    }

    getSelectComponent() {
        if (this.props.multiSelect)
            return (<CheckBox checked={this.props.checked}
                              onPress={() => this.props.onPress()}/>);
        else
            return (<Radio selected={this.props.checked}
                           onPress={() => this.props.onPress()}/>);
    }
}

export default PresetOptionItem;