import {Text, View} from "react-native";
import {DateTimePickerAndroid} from "@react-native-community/datetimepicker";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import Colors from "./Colors";
import General from "../../utility/General";
import {Button, Icon} from "native-base";
import Fonts from '../primitives/Fonts';

class DatePicker extends AbstractComponent {
    static propTypes = {
        dateValue: PropTypes.object,
        validationResult: PropTypes.object,
        actionName: PropTypes.string.isRequired,
        datePickerMode: PropTypes.string,
        timePickerMode: PropTypes.string,
        actionObject: PropTypes.object.isRequired,
        pickTime: PropTypes.bool,
        nonRemovable: PropTypes.bool,
        noDateMessageKey: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
    }


    dateDisplay(date) {
        const noDateMessageKey = this.props.noDateMessageKey || (this.props.pickTime ? "chooseDateAndTime" : "chooseADate");
        return _.isNil(date)
            ? this.I18n.t(noDateMessageKey)
            : (this.props.pickTime && !(General.hoursAndMinutesOfDateAreZero(date)))
                ? General.formatDateTime(date)
                : General.formatDate(date);
    }

    showDatePicker(datePickerOptions) {
        this.dismissKeyboard();
        DateTimePickerAndroid.open(datePickerOptions);
    }

    onDateChange(event, date, timePickerOptions) {
        if (event.type !== "dismissed") {
            this.props.actionObject.value = General.isoFormat(date);
            this.dispatchAction(this.props.actionName, this.props.actionObject);
            this.showTimePicker(timePickerOptions, date);
        }
    }

    showTimePicker(timePickerOptions, date) {
        this.dismissKeyboard();
        timePickerOptions.date = date;
        DateTimePickerAndroid.open(timePickerOptions);
    }

    onTimeChange(event, date) {
        if (event.type !== "dismissed") {
            this.props.actionObject.value = General.formatDateTime(date);
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    removeDate() {
        this.dismissKeyboard();
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
        const timePickerMode = _.isNil(this.props.datePickerMode) ?
            _.isNil(this.props.timePickerMode) ?
                'default' : this.props.timePickerMode
            : datePickerMode === 'calendar' ? 'clock' : datePickerMode;

        const timePickerOptions = {
            mode: "time",
            display: timePickerMode,
            is24Hour: true,
            onChange: (event, date) => this.onTimeChange(event, date),
            value: date
        };

        const dateOptions = {
            mode: "date",
            display: datePickerMode,
            is24Hour: true,
            onChange: (event, date) => this.onDateChange(event, date, timePickerOptions),
            value: date
        };

        return (
            <View>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <Text onPress={this.showDatePicker.bind(this, dateOptions, {mode: timePickerMode})}
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
