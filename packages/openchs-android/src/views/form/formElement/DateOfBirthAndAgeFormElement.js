import {View, StyleSheet, Text, TextInput, DatePickerAndroid} from 'react-native';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import AbstractComponent from '../../../framework/view/AbstractComponent';
import ValidationErrorMessage from "../ValidationErrorMessage";
import AbstractDataEntryState from "../../../state/AbstractDataEntryState";
import DGS from "../../primitives/DynamicGlobalStyles";
import {  Individual  } from 'avni-models';
import Colors from "../../primitives/Colors";
import Fonts from "../../primitives/Fonts";
import {CheckBox, Radio} from "native-base";
import _ from "lodash";
import General from "../../../utility/General";
import {Actions} from "../../../action/individual/IndividualRegisterActions";
import UserInfoService from "../../../service/UserInfoService";

class DateOfBirthAndAgeFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.userSettings = context.getService(UserInfoService).getUserSettings();
    }

    dateDisplay(date) {
        return _.isNil(date) ? this.I18n.t("chooseADate") : General.formatDate(date);
    }

    async showPicker(stateKey, options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.dispatchAction(Actions.REGISTRATION_ENTER_DOB, {value: new Date(year, month, day)});
        }
    }

    render() {
        const datePickerMode = _.isNil(this.userSettings.datePickerMode) ? 'calendar' : this.userSettings.datePickerMode;
        return (
            <View style={[this.formRow, {flexDirection: 'column'}]}>
                <View>
                    <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirth")}<Text
                        style={{color: Colors.ValidationError}}> * </Text></Text>
                </View>
                <View style={{flexDirection: 'row'}}>
                    <Text
                        onPress={this.showPicker.bind(this, 'simple', {date: this.props.state.individual.dateOfBirth, mode: datePickerMode})}
                        style={[DGS.formElementTextInput,
                            {
                                marginRight: DGS.resizeWidth(50), fontSize: Fonts.Large,
                                color: AbstractDataEntryState.hasValidationError(this.props.state, Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.DarkPrimaryColor
                            }]}>{this.dateDisplay(this.props.state.individual.dateOfBirth)}</Text>
                    <View style={{flexDirection: 'column-reverse', justifyContent: 'center', marginRight: 4}}>
                        <CheckBox checked={this.props.state.individual.dateOfBirthVerified}
                                  onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.props.state.individual.dateOfBirthVerified})}/>
                    </View>
                    <View style={{marginRight: DGS.resizeWidth(15)}}/>
                    <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirthVerified")}</Text>
                </View>
                <ValidationErrorMessage
                    validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.DOB)}/>

                <View>
                    <Text style={DGS.formElementLabel}>{this.I18n.t("age")}<Text
                        style={{color: Colors.ValidationError}}> * </Text></Text>
                </View>
                <View style={{flexDirection: 'row'}}>
                    <TextInput
                        style={{flex: 1, borderBottomWidth: 0, marginVertical: 0, paddingVertical: 5}}
                        keyboardType='numeric'
                        underlineColorAndroid={AbstractDataEntryState.hasValidationError(this.props.state, Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.InputBorderNormal}
                        value={_.isNil(this.props.state.age) ? "" : this.props.state.age}
                        onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})}/>
                    <View style={{flexDirection: 'column-reverse', marginLeft: DGS.resizeWidth(20)}}>
                        <Radio selected={this.props.state.ageProvidedInYears} color={Colors.AccentColor}
                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: true})}/>
                    </View>
                    <View style={{flexDirection: 'column-reverse'}}>
                        <Text style={DGS.formRadioText}>{this.I18n.t("years")}</Text>
                    </View>
                    <View style={{flexDirection: 'column-reverse', marginLeft: DGS.resizeWidth(20)}}>
                        <Radio selected={!this.props.state.ageProvidedInYears} color={Colors.AccentColor}
                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: false})}/>
                    </View>
                    <View style={{flexDirection: 'column-reverse'}}>
                        <Text style={DGS.formRadioText}>{this.I18n.t("months")}</Text>
                    </View>
                </View>
            </View>
        );
    }
}

export default DateOfBirthAndAgeFormElement;
