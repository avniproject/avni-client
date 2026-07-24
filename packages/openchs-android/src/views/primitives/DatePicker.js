import {StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import PropTypes from 'prop-types';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import _ from 'lodash';
import ValidationErrorMessage from '../form/ValidationErrorMessage';
import Colors from './Colors';
import General from '../../utility/General';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Styles from './Styles';

class DatePicker extends AbstractComponent {
    static propTypes = {
        dateValue: PropTypes.object,
        validationResult: PropTypes.object,
        actionName: PropTypes.string,
        datePickerMode: PropTypes.string,
        timePickerMode: PropTypes.string,
        actionObject: PropTypes.object,
        pickTime: PropTypes.bool,
        nonRemovable: PropTypes.bool,
        noDateMessageKey: PropTypes.string,
        onChange: PropTypes.func,
        overridingStyle: PropTypes.object,
        maximumDate: PropTypes.object,
        minimumDate: PropTypes.object,
        transparent: PropTypes.bool
    };

    static defaultProps = {
        onChange: _.noop,
        transparent: false
    }

    constructor(props, context) {
        super(props, context);
    }


    dateDisplay(date) {
        const noDateMessageKey = this.props.noDateMessageKey || (this.props.pickTime ? 'chooseDateAndTime' : 'chooseADate');
        return _.isNil(date)
            ? this.I18n.t(noDateMessageKey)
            : (this.props.pickTime && !(General.hoursAndMinutesOfDateAreZero(date)))
                ? General.toNumericDateTimeFormat(date)
                : General.toNumericDateFormat(date);
    }

    showDatePicker() {
        const datePickerOptions = {
            mode: 'date',
            display: _.isNil(this.props.datePickerMode) ? 'calendar' : this.props.datePickerMode,
            is24Hour: false,
            onChange: (event, date) => this.onDateChange(event, date),
            value: _.isNil(this.props.dateValue) ? new Date() : this.props.dateValue
        };
        if (!_.isNil(this.props.maximumDate)) datePickerOptions.maximumDate = this.props.maximumDate;
        if (!_.isNil(this.props.minimumDate)) datePickerOptions.minimumDate = this.props.minimumDate;

        this.dismissKeyboard();
        DateTimePickerAndroid.open(datePickerOptions);
    }

    notifyChange(value) {
        if (_.isNil(this.props.actionName)) {
            this.props.onChange(value);
        } else {
            this.props.actionObject.value = value;
            this.dispatchAction(this.props.actionName, this.props.actionObject);
        }
    }

    onDateChange(event, date) {
        if (event.type === 'dismissed') {
            return;
        }

        this.notifyChange(date);
        if (this.props.pickTime) {
            this.showTimePicker(date);
        }
    }

    showTimePicker(date) {
        const datePickerDisplay = _.isNil(this.props.datePickerMode) ? 'calendar' : this.props.datePickerMode;
        const timePickerDisplay = _.isNil(this.props.datePickerMode) ?
            _.isNil(this.props.timePickerMode) ?
                'default' : this.props.timePickerMode
            : datePickerDisplay === 'calendar' ? 'clock' : datePickerDisplay;

        const timePickerOptions = {
            mode: 'time',
            display: timePickerDisplay,
            is24Hour: false,
            onChange: (event, date) => this.onTimeChange(event, date),
            value: date
        };

        this.dismissKeyboard();
        timePickerOptions.date = date;
        DateTimePickerAndroid.open(timePickerOptions);
    }

    onTimeChange(event, date) {
        if (event.type === 'dismissed') {
            return;
        }

        this.notifyChange(date);
    }

    removeDate() {
        this.dismissKeyboard();
        this.notifyChange(null);
    }

    renderRemoveButton() {
        if (_.isNil(this.props.nonRemovable) && !_.isNil(this.props.dateValue)) {
            return (
                <TouchableNativeFeedback onPress={() => this.removeDate()}
                                         background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                                         useForeground>
                    <Icon name="backspace"
                          style={{marginLeft: 8, fontSize: 20, color: Colors.AccentColor}}/>
                </TouchableNativeFeedback>
            );
        }
    }

    render() {
        const hasError = !_.isNil(this.props.validationResult);
        const {transparent} = this.props;
        return (
            <View>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                    <TouchableNativeFeedback onPress={this.showDatePicker.bind(this)}
                                             background={TouchableNativeFeedback.SelectableBackgroundBorderless()}>
                        <View style={[styles.chipRow, !transparent && styles.chip, !transparent && hasError && styles.chipError]}>
                            <Text style={[styles.chipText, hasError && styles.chipTextError, this.props.overridingStyle]}>
                                {this.dateDisplay(this.props.dateValue)}
                            </Text>
                            <Icon name="calendar" style={[styles.calendarIcon, hasError && styles.chipTextError]}/>
                        </View>
                    </TouchableNativeFeedback>
                    {!transparent && this.renderRemoveButton()}
                </View>
                <View>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chip: {
        backgroundColor: Colors.BrandLight,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 160,
    },
    chipError: {
        backgroundColor: '#fdecea',
    },
    chipText: {
        fontSize: Styles.smallerTextSize,
        color: Colors.BrandPrimaryDark,
        fontWeight: '400',
        marginRight: 10,
    },
    chipTextError: {
        color: Colors.ValidationError,
    },
    calendarIcon: {
        fontSize: 18,
        color: Colors.BrandPrimaryDark,
    },
});

export default DatePicker;
