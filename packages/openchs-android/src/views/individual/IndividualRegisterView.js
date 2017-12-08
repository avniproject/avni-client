import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import _ from "lodash";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import WizardButtons from "../common/WizardButtons";
import {Individual} from "openchs-models";
import General from "../../utility/General";
import IndividualRegisterViewsMixin from "./IndividualRegisterViewsMixin";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import RegistrationDateFormElement from "../form/formElement/RegistrationDateFormElement";
import IndividualNameFormElement from "../form/formElement/IndividualNameFormElement";
import DateOfBirthAndAgeFormElement from "../form/formElement/DateOfBirthAndAgeFormElement";
import GenderFormElement from "../form/formElement/GenderFormElement";

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
                        <RegistrationDateFormElement state={this.state}/>
                        <IndividualNameFormElement state={this.state}/>
                        <DateOfBirthAndAgeFormElement state={this.state}/>
                        <GenderFormElement state={this.state}/>
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
}

export default IndividualRegisterView;