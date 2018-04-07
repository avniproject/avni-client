import {Text, TouchableOpacity, View, StyleSheet} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {CheckBox, Radio} from "native-base";
import Colors from '../primitives/Colors';
import _ from 'lodash';
import Styles from "./Styles";
import themes from "./themes"

class PresetOptionItem extends AbstractComponent {
    static inputTextStyle = {marginLeft: 11, color: Colors.InputNormal, flex: .95};

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

    render() {
        const color = _.isNil(this.props.validationResult) ? this.props.checked && this.props.abnormal ? Colors.AbnormalValueHighlight : Colors.InputNormal : Colors.ValidationError;
        const chunked = {
            padding: PresetOptionItem.styles.multiPadding,
            content: PresetOptionItem.styles.multiContent,
            container: [this.props.style, {flex: 1}]
        };
        const single = {
            padding: PresetOptionItem.styles.padding,
            content: PresetOptionItem.styles.content,
            container: this.props.style
        };
        const ToRender = this.props.chunked ? chunked : single;
        return (
            <TouchableOpacity onPress={() => this.props.onPress()} style={ToRender.container}>
                <View style={ToRender.container}>
                    <View style={ToRender.padding}/>
                    <View style={ToRender.content}>
                        {this.getSelectComponent()}
                        <Text style={[Styles.formBodyText, PresetOptionItem.inputTextStyle, {color: color}]}>
                            {this.props.displayText}
                        </Text>
                    </View>
                    <View style={ToRender.padding}/>
                </View>
            </TouchableOpacity>
        );
    }
}

export default PresetOptionItem;