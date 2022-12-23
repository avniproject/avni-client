import {Text, TouchableNativeFeedback, View} from "react-native";
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import Colors from "./Colors";
import General from "../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Fonts from '../primitives/Fonts';

class TimePicker extends AbstractComponent {
    static propTypes = {
        timeValue: PropTypes.string,
        validationResult: PropTypes.object,
        actionName: PropTypes.string.isRequired,
        actionObject: PropTypes.object.isRequired,
        timePickerDisplay: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        this.pickTime = _.isBoolean(props.pickTime) ? props.pickTime : false;
        this.noTimeMessageKey = "chooseATime";
        this.showTimePicker = this.showTimePicker.bind(this);
    }


    render() {
        const timePickerDisplay = _.isNil(this.props.timePickerDisplay) ?
            'default' : this.props.timePickerDisplay;
        const options = {
            mode: "time",
            display: timePickerDisplay,
            is24Hour: true,
            onChange: (event, date) => this.onTimeChange(event, date),
            value: _.isNil(this.props.timeValue) ? new Date() : General.toDateFromTime(this.props.timeValue)
        };

        return (
            <View>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <Text onPress={this.showTimePicker.bind(this, options)}
                          style={[{
                              fontSize: Fonts.Large,
                              color: _.isNil(this.props.validationResult) ? Colors.ActionButtonColor : Colors.ValidationError
                          }]}>
                        {this.timeDisplay()}
                    </Text>
                    {_.isNil(this.props.timeValue) ?
                        <View/>
                        :
                        <TouchableNativeFeedback transparent onPress={() => this.removeTime()} style={{height: 20, alignSelf: 'center'}}>
                            <Icon name='backspace' style={{marginLeft: 8, alignSelf: 'center', fontSize: 20, color: Colors.AccentColor}}/>
                        </TouchableNativeFeedback>
                    }
                </View>
                <View>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>
        );
    }

    timeDisplay() {
        return _.isNil(this.props.timeValue)
            ? this.I18n.t(this.noTimeMessageKey) : this.props.timeValue;
    }

    showTimePicker(options) {
        this.dismissKeyboard();
        DateTimePickerAndroid.open(options);
    }

    onTimeChange(event, date) {
        if (event.type !== "dismissed") {
            this.props.actionObject.value = General.toISOFormatTime(date.getHours(), date.getMinutes());
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    removeTime() {
        this.dismissKeyboard();
        this.props.actionObject.value = null;
        this.dispatchAction(this.props.actionName, this.props.actionObject);
    }
}

export default TimePicker;
