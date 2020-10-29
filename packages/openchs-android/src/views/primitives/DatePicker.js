import {DatePickerAndroid, TimePickerAndroid, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import Colors from "./Colors";
import General from "../../utility/General";
import {Button, Icon} from "native-base";
import {Text} from "react-native";
import Fonts from '../primitives/Fonts';

class DatePicker extends AbstractComponent {
    static propTypes = {
        dateValue: PropTypes.object,
        validationResult: PropTypes.object,
        actionName: PropTypes.string.isRequired,
        datePickerMode: PropTypes.string,
        actionObject: PropTypes.object.isRequired,
        pickTime: PropTypes.bool,
        nonRemovable: PropTypes.bool,
        noDateMessageKey: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        this.showTimePicker = this.showTimePicker.bind(this);
    }


    dateDisplay(date) {
        const noDateMessageKey = this.props.noDateMessageKey || (this.props.pickTime ? "chooseDateAndTime" : "chooseADate");
        return _.isNil(date)
            ? this.I18n.t(noDateMessageKey)
            : (this.props.pickTime && !(General.hoursAndMinutesOfDateAreZero(date)))
                ? General.formatDateTime(date)
                : General.formatDate(date);
    }

    async showDatePicker(datePickerOptions, timePickerOptions) {
        const {action, year, month, day} = await DatePickerAndroid.open(datePickerOptions);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.props.actionObject.value = new Date(year, month, day);
            if (this.props.pickTime) {
                this.showTimePicker(this.props.actionObject.value, timePickerOptions);
            }
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    async showTimePicker(date, timePickerOptions) {
        const {action, hour, minute} = await TimePickerAndroid.open(timePickerOptions);
        if (action !== TimePickerAndroid.dismissedAction) {
            this.props.actionObject.value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    removeDate() {
        this.props.actionObject.value = null;
        this.dispatchAction(this.props.actionName, this.props.actionObject);
    }

    renderRemoveButton() {
        if (_.isNil(this.props.nonRemovable)  && !_.isNil(this.props.dateValue)) {
            return (
                <Button transparent onPress={() => this.removeDate()} style={{height: 20, alignSelf: 'center'}}>
                    <Icon name='backspace' style={{fontSize: 20, color: '#229688'}}/>
                </Button>);
        }
    }

    render() {
        const date = _.isNil(this.props.dateValue) ? new Date() : this.props.dateValue;
        const datePickerMode = _.isNil(this.props.datePickerMode) ? 'calendar' : this.props.datePickerMode;
        const timePickerMode = datePickerMode === 'calendar' ? 'clock' : datePickerMode;
        return (
            <View>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <Text onPress={this.showDatePicker.bind(this, {date: date, mode : datePickerMode}, {mode: timePickerMode})}
                          style={[{
                              fontSize: Fonts.Large,
                              color: _.isNil(this.props.validationResult) ? Colors.ActionButtonColor : Colors.ValidationError
                          }]}>
                        {this.dateDisplay(this.props.dateValue)}
                    </Text>
                    {this.renderRemoveButton()}
                </View>
                <View>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>
        );
    }
}

export default DatePicker;
