import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import PropTypes from 'prop-types';
import React from 'react';
import AbstractComponent from '../../../framework/view/AbstractComponent';
import AbstractDataEntryState from '../../../state/AbstractDataEntryState';
import DGS from '../../primitives/DynamicGlobalStyles';
import {Individual} from 'avni-models';
import Colors from '../../primitives/Colors';
import Fonts from '../../primitives/Fonts';
import Styles from '../../primitives/Styles';
import {Checkbox as CheckBox} from 'native-base';
import _ from 'lodash';
import {Actions} from '../../../action/individual/PersonRegisterActions';
import UserInfoService from '../../../service/UserInfoService';
import DatePicker from '../../primitives/DatePicker';

class DateOfBirthAndAgeFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.userSettings = context.getService(UserInfoService).getUserSettingsObject();
    }

    render() {
        const dobValidationResult = AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.DOB);
        const datePickerMode = _.isNil(this.userSettings.datePickerMode) ? 'calendar' : this.userSettings.datePickerMode;
        const ageHasError = AbstractDataEntryState.hasValidationError(this.props.state, Individual.validationKeys.DOB);
        return (
            <View style={[this.formRow, {flexDirection: 'column', marginTop: 20}]}>
                <View>
                    <Text style={DGS.formElementLabel}>{this.I18n.t('dateOfBirth')}<Text
                        style={{color: Colors.ValidationError}}> * </Text></Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4}}>
                    <View style={{backgroundColor: Colors.BrandLight, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10}}>
                        <DatePicker dateValue={this.props.state.individual.dateOfBirth}
                                    validationResult={dobValidationResult}
                                    datePickerMode={datePickerMode}
                                    actionName={Actions.REGISTRATION_ENTER_DOB}
                                    actionObject={{}}
                                    nonRemovable={true}
                                    transparent={true}
                        />
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <CheckBox isChecked={this.props.state.individual.dateOfBirthVerified}
                                  accessible={true}
                                  accessibilityLabel={"Is date of birth verified?"}
                                  onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.props.state.individual.dateOfBirthVerified})}/>
                        <View style={{marginRight: DGS.resizeWidth(8)}}/>
                        <Text style={DGS.formElementLabel}>{this.I18n.t('dateOfBirthVerified')}</Text>
                    </View>
                </View>

                <View style={{marginTop: 28}}>
                    <Text style={DGS.formElementLabel}>{this.I18n.t('age')}<Text
                        style={{color: Colors.ValidationError}}> * </Text></Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                    <View style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: ageHasError ? Colors.ValidationError : Colors.InputBorderNormal,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 4
                    }}>
                        <TextInput
                            style={{fontSize: Fonts.Large, marginVertical: 0, paddingVertical: 5}}
                            keyboardType="numeric"
                            maxLength={4}
                            underlineColorAndroid={'transparent'}
                            value={_.isNil(this.props.state.age) ? '' : this.props.state.age}
                            onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})}/>
                    </View>
                    <View style={[styles.segmentedControl, {marginLeft: 16}]}
                          accessible={true}
                          accessibilityLabel={"Choose type of age"}>
                        {[{key: 'years', isYears: true}, {key: 'months', isYears: false}].map(({key, isYears}) => {
                            const selected = this.props.state.ageProvidedInYears === isYears;
                            return (
                                <TouchableOpacity key={key}
                                                  activeOpacity={0.7}
                                                  accessible={true}
                                                  accessibilityLabel={`Choose ${key}`}
                                                  style={[styles.segment, selected && styles.segmentSelected]}
                                                  onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: isYears})}>
                                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{this.I18n.t(key)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        );
    }
}

export default DateOfBirthAndAgeFormElement;

const styles = StyleSheet.create({
    segmentedControl: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        padding: 8,
        backgroundColor: Colors.WhiteContentBackground
    },
    segment: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    segmentSelected: {
        backgroundColor: Colors.BrandPrimary
    },
    segmentText: {
        fontSize: Styles.normalTextSize,
        color: Colors.TextPrimaryDark
    },
    segmentTextSelected: {
        color: Colors.TextOnPrimaryColor
    }
});
