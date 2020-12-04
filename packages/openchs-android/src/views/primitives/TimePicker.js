import {TimePickerAndroid, View, Text} from "react-native";
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
        timePickerMode: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        this.pickTime = _.isBoolean(props.pickTime) ? props.pickTime : false;
        this.noTimeMessageKey = "chooseATime";
        this.showTimePicker = this.showTimePicker.bind(this);
    }


render() {
    console.log(`TimePicker: props timePickerMode: ${this.props.timePickerMode}`);
    const timePickerMode = _.isNil(this.props.timePickerMode) ?
            'default' : this.props.timePickerMode;
        console.log(`TimePicker: final timePickerMode: ${timePickerMode}`);
        const options = _.isNil(this.props.timeValue) ?  {mode: timePickerMode} : _.merge(General.toTimeObject(this.props.timeValue), {mode: timePickerMode});
    console.log(`TimePicker: options: ${JSON.stringify(options)}`);

        return (
            <View>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <Text onPress={this.showTimePicker.bind(this, options)}
                        style={[{fontSize: Fonts.Large, color: _.isNil(this.props.validationResult) ? Colors.ActionButtonColor : Colors.ValidationError}]}>
                        {this.timeDisplay()}
                    </Text>
                    { _.isNil(this.props.timeValue) ?
                        <View/>
                        :
                        <Button transparent onPress={() => this.removeTime()} style={{height:20, alignSelf: 'center'}}>
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

    timeDisplay() {
        return _.isNil(this.props.timeValue)
        ? this.I18n.t(this.noTimeMessageKey) : General.toDisplayTime(this.props.timeValue);
    }

    async showTimePicker(options) {
        const {action, hour, minute} = await TimePickerAndroid.open(options);
        if (action !== TimePickerAndroid.dismissedAction) {
            this.props.actionObject.value = General.toISOFormatTime(hour, minute);
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    removeTime() {
        this.props.actionObject.value = null;
        this.dispatchAction(this.props.actionName, this.props.actionObject);
    }
}

export default TimePicker;