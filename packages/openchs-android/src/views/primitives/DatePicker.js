import {DatePickerAndroid, TimePickerAndroid, View} from "react-native";
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
        dateValue: React.PropTypes.object,
        validationResult: React.PropTypes.object,
        actionName: React.PropTypes.string.isRequired,
        actionObject: React.PropTypes.object.isRequired,
        pickTime: React.PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
        this.pickTime = _.isBoolean(props.pickTime) ? props.pickTime : false;
        this.noDateMessageKey = this.pickTime ? "chooseDateAndTime" : "chooseADate";
        this.showTimePicker = this.showTimePicker.bind(this);
    }

    render() {
        const date = _.isNil(this.props.dateValue) ? new Date() : this.props.dateValue;
        return (
            <View>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <Text onPress={this.showDatePicker.bind(this, {date: date})}
                        style={[{fontSize: Fonts.Large, color: _.isNil(this.props.validationResult) ? Colors.ActionButtonColor : Colors.ValidationError}]}>
                            {this.dateDisplay(this.props.dateValue)}
                    </Text>
                    { _.isNil(this.props.dateValue) ?
                        <View/>
                        :
                        <Button transparent onPress={() => this.removeDate()} style={{height:20, alignSelf: 'center'}}>
                            <Icon name='backspace' style={{fontSize: 20, color:'#229688'}}/>
                        </Button>
                    }
                </View>
                <View>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>
        );
    }

    dateDisplay(date) {
        return _.isNil(date)
        ? this.I18n.t(this.noDateMessageKey)
        : (this.pickTime && !(General.hoursAndMinutesOfDateAreZero(date)))
            ? General.formatDateTime(date)
            : General.formatDate(date);
    }

    async showDatePicker(options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.props.actionObject.value = new Date(year, month, day);
            if(this.pickTime) {
              this.showTimePicker(this.props.actionObject.value);
            }
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    async showTimePicker(date) {
        const { action, hour, minute } = await TimePickerAndroid.open({});
        if (action !== TimePickerAndroid.dismissedAction) {
            this.props.actionObject.value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    removeDate() {
        this.props.actionObject.value = null;
        this.dispatchAction(this.props.actionName, this.props.actionObject);
    }
}

export default DatePicker;