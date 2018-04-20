import {DatePickerAndroid, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import DynamicGlobalStyles from "./DynamicGlobalStyles";
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
        noDateMessageKey: React.PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const date = _.isNil(this.props.dateValue) ? new Date() : this.props.dateValue;
        return (
            <View>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <Text onPress={this.showPicker.bind(this, {date: date})}
                        style={[{fontSize: Fonts.Large, color: _.isNil(this.props.validationResult) ? Colors.ActionButtonColor : Colors.ValidationError}]}>
                            {this.dateDisplay(this.props.dateValue, this.props.noDateMessageKey)}
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

    dateDisplay(date, defaultMessageKey) {
        return _.isNil(date) ? this.I18n.t(defaultMessageKey ? defaultMessageKey : "chooseADate") : General.formatDate(date);
    }

    async showPicker(options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.props.actionObject.value = new Date(year, month, day);
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    removeDate() {
        this.props.actionObject.value = null;
        this.dispatchAction(this.props.actionName, this.props.actionObject);
    }
}

export default DatePicker;