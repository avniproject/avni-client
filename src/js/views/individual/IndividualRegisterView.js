import {View, StyleSheet, ScrollView, TextInput, DatePickerAndroid, TouchableHighlight, Alert} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import DGS from "../primitives/DynamicGlobalStyles";
import {Content, CheckBox, Text, Container, Radio, InputGroup, Input} from "native-base";
import themes from "../primitives/themes";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import _ from "lodash";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import AppHeader from "../common/AppHeader";
import ReducerKeys from "../../reducer";
import WizardButtons from "../common/WizardButtons";
import StaticFormElement from "../viewmodel/StaticFormElement";
import Individual from "../../models/Individual";
import TextFormElement from "../form/TextFormElement";
import General from "../../utility/General";
import Colors from "../primitives/Colors";
import IndividualRegisterViewsMixin from './IndividualRegisterViewsMixin';
import PrimitiveValue from '../../models/observation/PrimitiveValue';

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, ReducerKeys.individualRegister);
        this.contentGridMarginStyle = {marginTop: DGS.resizeHeight(16), marginHorizontal: DGS.resizeWidth(24)};
    }

    viewName() {
        return "IndividualRegisterView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    getValidationError(formElementIdentifier) {
        return _.find(this.state.validationResults, (validationResult) => validationResult.formIdentifier === formElementIdentifier);
    }

    hasValidationError(formElementIdentifier) {
        const validationError = this.getValidationError(formElementIdentifier);
        return !_.isNil(validationError);
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t('registration')}/>
                    <View style={[this.contentGridMarginStyle, {flexDirection: 'column'}]}>
                        <TextFormElement actionName={Actions.REGISTRATION_ENTER_NAME}
                                         element={new StaticFormElement('name')}
                                         validationResult={this.getValidationError(Individual.validationKeys.NAME)}
                                         value={new PrimitiveValue(this.state.individual.name)}/>
                        <View style={[DGS.formRow, {flexDirection: 'column'}]}>
                            <View>
                                <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirth")}</Text>
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                <Text onPress={this.showPicker.bind(this, 'simple', {date: this.state.individual.dateOfBirth})}
                                      style={[DGS.formElementTextInput,
                                                {marginRight: DGS.resizeWidth(50), fontSize: 16,
                                                    color: this.hasValidationError(Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.InputNormal}]}>{this.dateDisplay(this.state.individual.dateOfBirth)}</Text>
                                <View style={{flexDirection: 'column-reverse'}}>
                                    <CheckBox checked={this.state.individual.dateOfBirthVerified}
                                              onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.state.individual.dateOfBirthVerified})}/>
                                </View>
                                <View style={{marginRight: DGS.resizeWidth(15)}}/>
                                <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirthVerified")}</Text>
                            </View>
                        </View>
                        <View style={[DGS.formRow, {flexDirection: 'column'}]}>
                            <View>
                                <View>
                                    <Text style={DGS.formElementLabel}>{this.I18n.t("age")}</Text>
                                </View>
                                <View style={{flexDirection: 'row'}}>
                                    <InputGroup style={{flex: 1, borderColor: this.hasValidationError(Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.InputBorderNormal}} borderType='underline'>
                                        <Input value={_.isNil(this.state.age) ? "" : this.state.age} onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})} />
                                    </InputGroup>
                                    <View style={{flexDirection: 'column-reverse', marginLeft: DGS.resizeWidth(20)}}>
                                        <Radio selected={this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: true})}/>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Text style={DGS.formRadioText}>{this.I18n.t("years")}</Text>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse', marginLeft: DGS.resizeWidth(20)}}>
                                        <Radio selected={!this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: false})}/>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Text style={DGS.formRadioText}>{this.I18n.t("months")}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View style={DGS.formRow}>
                            <RadioGroup action={Actions.REGISTRATION_ENTER_GENDER}
                                        labelValuePairs={this.state.genders.map((gender) => new RadioLabelValue(gender.name, gender))}
                                        labelKey="gender"
                                        selectionFn={(gender) => gender.equals(this.state.individual.gender)}
                                        validationError={this.getValidationError(Individual.validationKeys.GENDER)}
                            />
                        </View>
                        <View style={DGS.formRow}>
                            <AddressLevels selectedAddressLevels={_.isNil(this.state.individual.lowestAddressLevel) ? [] : [this.state.individual.lowestAddressLevel]}
                                           multiSelect={false} actionName={Actions.REGISTRATION_ENTER_ADDRESS_LEVEL}
                                            validationError={this.getValidationError(Individual.validationKeys.LOWEST_ADDRESS_LEVEL)}/>
                        </View>
                    </View>
                    <WizardButtons previous={{func: () => {}, visible: false}}
                                   next={{func: () => IndividualRegisterViewsMixin.next(this), label: this.I18n.t(this.state.wizard.isLastPage() ? 'register' : 'next')}}
                                   nextDisabled={this.state.validationResults.length !== 0}
                    />
                </Content>
            </Container>
        );
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
}

export default IndividualRegisterView;