import {View, StyleSheet,  DatePickerAndroid} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, Row} from "native-base";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import _ from 'lodash';
import General from "../../utility/General";


class DateFormElement extends AbstractComponent {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        dateValue : React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View>
                <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.props.element.name}</Text>
                </Row>
                <Row>
                    <Text onPress={this.showPicker.bind(this, 'simple', {date: new Date()})}
                          style={DynamicGlobalStyles.formElementLabel}>{this.dateDisplay(this.props.dateValue)}</Text>
                </Row>
            </View>);
    }

    dateDisplay(date) {
        console.log(date);
        return _.isNil(date) ? this.I18n.t("chooseADate") : General.formatDate(date.answer);
    }

    async showPicker(stateKey, options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: new Date(year, month, day)});
        }
    }
}

export default DateFormElement;