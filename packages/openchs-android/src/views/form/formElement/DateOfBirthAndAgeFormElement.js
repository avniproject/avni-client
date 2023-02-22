import {Text, TextInput, View} from 'react-native';
import {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import PropTypes from 'prop-types';
import React from 'react';
import AbstractComponent from '../../../framework/view/AbstractComponent';
import ValidationErrorMessage from '../ValidationErrorMessage';
import AbstractDataEntryState from '../../../state/AbstractDataEntryState';
import DGS from '../../primitives/DynamicGlobalStyles';
import {Individual} from 'avni-models';
import Colors from '../../primitives/Colors';
import Fonts from '../../primitives/Fonts';
import {Checkbox as CheckBox, Radio} from 'native-base';
import _ from 'lodash';
import General from '../../../utility/General';
import {Actions} from '../../../action/individual/PersonRegisterActions';
import UserInfoService from '../../../service/UserInfoService';

class DateOfBirthAndAgeFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.userSettings = context.getService(UserInfoService).getUserSettingsObject();
    }

    dateDisplay(date) {
        return _.isNil(date) ? this.I18n.t('chooseADate') : General.formatDate(date);
    }

    onDateOfBirthChanged(event, date) {
        if (event.type === 'dismissed') {
            return;
        }
        this.dispatchAction(Actions.REGISTRATION_ENTER_DOB, {value: date});
    }

    showPicker() {
        const datePickerMode = _.isNil(this.userSettings.datePickerMode) ? 'calendar' : this.userSettings.datePickerMode;
        const dateOfBirth = this.props.state.individual.dateOfBirth || new Date();
        const options = {value: dateOfBirth, mode: datePickerMode, onChange: this.onDateOfBirthChanged.bind(this)};

        DateTimePickerAndroid.open(options);
    }

    render() {
        return (
            <View style={[this.formRow, {flexDirection: 'column'}]}>
                <View>
                    <Text style={DGS.formElementLabel}>{this.I18n.t('dateOfBirth')}<Text
                        style={{color: Colors.ValidationError}}> * </Text></Text>
                </View>
                <View style={{flexDirection: 'row'}}>
                    <Text
                        onPress={this.showPicker.bind(this)}
                        style={[DGS.formElementTextInput,
                            {
                                marginRight: DGS.resizeWidth(50), fontSize: Fonts.Large,
                                color: AbstractDataEntryState.hasValidationError(this.props.state, Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.DarkPrimaryColor
                            }]}>{this.dateDisplay(this.props.state.individual.dateOfBirth)}</Text>
                    <View style={{flexDirection: 'column-reverse', justifyContent: 'center', marginRight: 4}}>
                        <CheckBox isChecked={this.props.state.individual.dateOfBirthVerified}
                                  accessible={true}
                                  accessibilityLabel={"Is date of birth verified?"}
                                  onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.props.state.individual.dateOfBirthVerified})}/>
                    </View>
                    <View style={{marginRight: DGS.resizeWidth(15)}}/>
                    <Text style={DGS.formElementLabel}>{this.I18n.t('dateOfBirthVerified')}</Text>
                </View>
                <ValidationErrorMessage
                    validationResult={AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.DOB)}/>

                <View>
                    <Text style={DGS.formElementLabel}>{this.I18n.t('age')}<Text
                        style={{color: Colors.ValidationError}}> * </Text></Text>
                </View>
                <View style={{flexDirection: 'row'}}>
                    <TextInput
                        style={{flex: 1, borderBottomWidth: 0, marginVertical: 0, paddingVertical: 5}}
                        keyboardType="numeric"
                        maxLength={4}
                        underlineColorAndroid={AbstractDataEntryState.hasValidationError(this.props.state, Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.InputBorderNormal}
                        value={_.isNil(this.props.state.age) ? '' : this.props.state.age}
                        onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})}/>
                    <Radio.Group style={{flexDirection: 'row'}}
                                 accessible={true}
                                 accessibilityLabel={"Choose type of age"}
                                 value={this.props.state.ageProvidedInYears ? 'years' : 'months'}
                                 onChange={(value) => {
                                     this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: value === 'years'});
                                 }}>
                        <Radio style={{marginLeft: DGS.resizeWidth(20)}} color={Colors.AccentColor} value={'years'}
                               accessible={true}
                               accessibilityLabel={"Choose years"}
                        />
                        <Text style={DGS.formRadioText}>{this.I18n.t('years')}</Text>
                        <Radio style={{marginLeft: DGS.resizeWidth(20)}} color={Colors.AccentColor} value={'months'}
                               accessible={true}
                               accessibilityLabel={"Choose months"}
                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: false})}/>
                        <Text style={DGS.formRadioText}>{this.I18n.t('months')}</Text>
                    </Radio.Group>
                </View>
            </View>
        );
    }
}

export default DateOfBirthAndAgeFormElement;
