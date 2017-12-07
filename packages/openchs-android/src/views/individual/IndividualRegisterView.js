import {DatePickerAndroid, TextInput, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import DGS from "../primitives/DynamicGlobalStyles";
import {CheckBox, Radio, Text} from "native-base";
import themes from "../primitives/themes";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import _ from "lodash";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import WizardButtons from "../common/WizardButtons";
import StaticFormElement from "../viewmodel/StaticFormElement";
import {Individual, PrimitiveValue} from "openchs-models";
import TextFormElement from "../form/formElement/TextFormElement";
import General from "../../utility/General";
import Colors from "../primitives/Colors";
import IndividualRegisterViewsMixin from "./IndividualRegisterViewsMixin";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import DateFormElement from "../form/formElement/DateFormElement";
import Fonts from "../primitives/Fonts";
import Distances from "../primitives/Distances";

import ValidationErrorMessage from "../form/ValidationErrorMessage";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualRegister);
        this.formRow = {marginTop: Distances.ScaledVerticalSpacingBetweenFormElements};
    }

    viewName() {
        return 'IndividualRegisterView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: this.props.params.individualUUID});
        super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.wizard.isNonFormPage();
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('registration')}/>
                    <View style={{
                        marginTop: Distances.ScaledVerticalSpacingDisplaySections,
                        flexDirection: 'column',
                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                    }}>
                        <DateFormElement actionName={Actions.REGISTRATION_ENTER_REGISTRATION_DATE}
                                         element={new StaticFormElement('registrationDate', true)}
                                         dateValue={new PrimitiveValue(this.state.individual.registrationDate)}
                                         validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_DATE)}/>
                        <TextFormElement actionName={Actions.REGISTRATION_ENTER_FIRST_NAME}
                                         element={new StaticFormElement('firstName', true)}
                                         validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.FIRST_NAME)}
                                         value={new PrimitiveValue(this.state.individual.firstName)}
                                         style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                        <TextFormElement actionName={Actions.REGISTRATION_ENTER_LAST_NAME}
                                         element={new StaticFormElement('lastName', true)}
                                         validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.LAST_NAME)}
                                         value={new PrimitiveValue(this.state.individual.lastName)}
                                         style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                        <View style={[this.formRow, {flexDirection: 'column'}]}>
                            <View>
                                <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirth")}<Text
                                    style={{color: Colors.ValidationError}}> * </Text></Text>
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                <Text
                                    onPress={this.showPicker.bind(this, 'simple', {date: this.state.individual.dateOfBirth})}
                                    style={[DGS.formElementTextInput,
                                        {
                                            marginRight: DGS.resizeWidth(50), fontSize: Fonts.Large,
                                            color: AbstractDataEntryState.hasValidationError(this.state, Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.InputNormal
                                        }]}>{this.dateDisplay(this.state.individual.dateOfBirth)}</Text>
                                <View style={{flexDirection: 'column-reverse'}}>
                                    <CheckBox checked={this.state.individual.dateOfBirthVerified}
                                              onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.state.individual.dateOfBirthVerified})}/>
                                </View>
                                <View style={{marginRight: DGS.resizeWidth(15)}}/>
                                <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirthVerified")}</Text>
                            </View>
                            <ValidationErrorMessage
                                validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.DOB)}/>
                        </View>
                        <View style={[this.formRow, {flexDirection: 'column'}]}>
                            <View>
                                <Text style={DGS.formElementLabel}>{this.I18n.t("age")}<Text
                                    style={{color: Colors.ValidationError}}> * </Text></Text>
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                <TextInput
                                    style={{flex: 1, borderBottomWidth: 0, marginVertical: 0, paddingVertical: 5}}
                                    underlineColorAndroid={AbstractDataEntryState.hasValidationError(this.state, Individual.validationKeys.DOB) ? Colors.ValidationError : Colors.InputBorderNormal}
                                    value={_.isNil(this.state.age) ? "" : this.state.age}
                                    onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})}/>
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
                        <RadioGroup
                            onPress={({value}) => this.dispatchAction(Actions.REGISTRATION_ENTER_GENDER, {value: value})}
                            labelValuePairs={this.state.genders.map((gender) => new RadioLabelValue(gender.name, gender))}
                            labelKey="gender"
                            selectionFn={(gender) => gender.equals(this.state.individual.gender)}
                            validationError={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.GENDER)}
                            style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                            mandatory={true}
                        />
                        <AddressLevels
                            selectedAddressLevels={_.isNil(this.state.individual.lowestAddressLevel) ? [] : [this.state.individual.lowestAddressLevel]}
                            multiSelect={false} actionName={Actions.REGISTRATION_ENTER_ADDRESS_LEVEL}
                            validationError={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.LOWEST_ADDRESS_LEVEL)}
                            style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                            mandatory={true}
                        />
                        <WizardButtons
                            next={{func: () => IndividualRegisterViewsMixin.next(this), label: this.I18n.t('next')}}/>
                    </View>
                </CHSContent>
            </CHSContainer>
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