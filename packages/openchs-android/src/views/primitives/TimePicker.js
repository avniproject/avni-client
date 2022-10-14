import {Text, View} from "react-native";
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import Colors from "./Colors";
import General from "../../utility/General";
import {Button, Icon} from "native-base";
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
        console.log(`TimePicker: props timePickerDisplay: ${this.props.timePickerDisplay}`);
        const timePickerDisplay = _.isNil(this.props.timePickerDisplay) ?
            'default' : this.props.timePickerDisplay;
        console.log(`TimePicker: final timePickerDisplay: ${timePickerDisplay}`);
        const options = {
            mode: "time",
            display: timePickerDisplay,
            is24Hour: true,
            onChange: (event, date) => this.onTimeChange(event, date),
            value: _.isNil(this.props.timeValue) ? new Date() : this.props.timeValue
        };
        console.log(`TimePicker: options: ${JSON.stringify(options)}`);

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
                        <Button transparent onPress={() => this.removeTime()} style={{height: 20, alignSelf: 'center'}}>
                            <Icon name='backspace' style={{fontSize: 20, color: '#229688'}}/>
                        </Button>
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
            ? this.I18n.t(this.noTimeMessageKey) : General.toDisplayTime(this.props.timeValue);
    }

    showTimePicker(options) {
        this.dismissKeyboard();
        DateTimePickerAndroid.open(options);
    }

    onTimeChange(event, date) {
        if (event.type !== "dismissed") {
            this.props.actionObject.value = General.isoFormat(date);
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
