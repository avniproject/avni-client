import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/familyFolder/FamilyRegisterActions";
import _ from "lodash";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import WizardButtons from "../common/WizardButtons";
import {Family, PrimitiveValue} from "openchs-models";
import General from "../../utility/General";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import DateFormElement from "../form/formElement/DateFormElement";
import TextFormElement from "../form/formElement/TextFormElement";
import IndividualFormElement from "../form/formElement/IndividualFormElement";
import StaticFormElement from "../viewmodel/StaticFormElement";
import FamilyRegisterViewsMixin from "./FamilyRegisterViewsMixin";

@Path('/familyRegister')
class FamilyRegisterView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.familyRegister);
        this.formRow = {marginTop: Distances.ScaledVerticalSpacingBetweenFormElements};
    }

    viewName() {
        return 'FamilyRegisterView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {familyUUID: this.props.params.familyUUID});
        super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.wizard.isNonFormPage();
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        const headOfFamilySearchHeaderMessage = `Head of Family - ${this.I18n.t('search')}`;
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('familyRegistration')}/>
                    <View style={{
                        marginTop: Distances.ScaledVerticalSpacingDisplaySections,
                        flexDirection: 'column',
                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                    }}>
                        <DateFormElement actionName={Actions.REGISTRATION_ENTER_REGISTRATION_DATE}
                                         element={new StaticFormElement('registrationDate', true)}
                                         dateValue={new PrimitiveValue(this.state.family.registrationDate)}
                                         validationResult={AbstractDataEntryState.getValidationError(this.state, Family.validationKeys.REGISTRATION_DATE)}/>

                        <AddressLevels
                            selectedAddressLevels={_.isNil(this.state.family.lowestAddressLevel) ? [] : [this.state.family.lowestAddressLevel]}
                            multiSelect={false} actionName={Actions.REGISTRATION_ENTER_ADDRESS_LEVEL}
                            validationError={AbstractDataEntryState.getValidationError(this.state, Family.validationKeys.LOWEST_ADDRESS_LEVEL)}
                            style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                            mandatory={true}
                        />
                        <TextFormElement
                            element={new StaticFormElement('Type of Family', true)}
                            actionName={Actions.REGISTRATION_ENTER_TYPE_OF_FAMILY}
                            value={new PrimitiveValue(this.state.family.typeOfFamily)}
                            style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Family.validationKeys.TYPE_OF_FAMILY)}
                            multiline={false}
                        />
                        <TextFormElement
                            element={new StaticFormElement('Household Number', true)}
                            actionName={Actions.REGISTRATION_ENTER_HOUSEHOLD_NUMBER}
                            value={new PrimitiveValue(this.state.family.householdNumber)}
                            style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Family.validationKeys.HOUSEHOLD_NUMBER)}
                            multiline={false}
                        />
                        <IndividualFormElement
                            individualNameValue={_.isNil(this.state.family.headOfFamily.name) ? "" : this.state.family.headOfFamily.name}
                            element={new StaticFormElement('Head of Family', true)}
                            inputChangeActionName={Actions.REGISTRATION_ENTER_HEAD_OF_FAMILY}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Family.validationKeys.HEAD_OF_FAMILY)}
                            searchHeaderMessage={headOfFamilySearchHeaderMessage}
                        />

                        <WizardButtons
                            next={{func: () => FamilyRegisterViewsMixin.next(this), label: this.I18n.t('next')}}/>

                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default FamilyRegisterView;