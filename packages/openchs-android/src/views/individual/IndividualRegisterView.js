import {ToastAndroid, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import _ from "lodash";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import WizardButtons from "../common/WizardButtons";
import {Individual, WorkItem} from 'avni-models';
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
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import SubjectRegisterView from "../subject/SubjectRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import HouseholdState from "../../state/HouseholdState";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import SingleSelectMediaFormElement from "../form/formElement/SingleSelectMediaFormElement";
import {PrimitiveValue, SubjectType} from "openchs-models";
import StaticFormElement from "../viewmodel/StaticFormElement";
import EntityService from "../../service/EntityService";

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualRegister);
        this.formRow = {marginTop: Distances.ScaledVerticalSpacingBetweenFormElements};
        let currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        let subjectTypeName = currentWorkItem.parameters.subjectTypeName;
        const subjectType = context.getService(EntityService).findByKey('name', subjectTypeName, SubjectType.schema.name);
        this.state = {displayed:true, isAllowedProfilePicture: subjectType.allowProfilePicture};
    }

    viewName() {
        return 'IndividualRegisterView';
    }

    getTitleForGroupSubject(){
        const currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        if (_.includes([WorkItem.type.HOUSEHOLD, WorkItem.type.ADD_MEMBER], currentWorkItem.type)) {
            const {headOfHousehold} = currentWorkItem.parameters;
            return headOfHousehold ? 'headOfHouseholdReg' : 'memberReg';
        }
    }

    get registrationType() {
        const workListName = _.get(this, 'props.params.workLists.currentWorkList.name');
        const regName = workListName === 'Enrolment' ? _.get(_.find(this.props.params.workLists.currentWorkList.workItems, wl => wl.type === 'PROGRAM_ENROLMENT'), "parameters.programName") : workListName;
        return this.getTitleForGroupSubject() || regName + ' ' || 'REG_DISPLAY-Individual';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD,
            {
                individualUUID: this.props.params.individualUUID,
                workLists: this.props.params.workLists,
                isDraftEntity: this.props.params.isDraftEntity,
                pageNumber: this.props.params.pageNumber,
            });
        super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.wizard.isNonFormPage();
    }

    displayMessage(message) {
        if (message && this.state.displayed){
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.setState({displayed:false})
        }
    }

    static canLoad(args, parent) {
        return SubjectRegisterView.canLoad(args, parent);
    }

    onAppHeaderBack(saveDraftOn) {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [IndividualRegisterView]);
        saveDraftOn ? onYesPress() : AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    render() {
        General.logDebug(this.viewName(), `render`);
        const profilePicFormElement = new StaticFormElement("profilePicture", false, 'Profile-Pics', []);
        const editing = !_.isNil(this.props.params.individualUUID);
        const title = `${this.I18n.t(this.registrationType)} ${this.I18n.t('registration')}`;
        {this.displayMessage(this.props.params.message)}
        return (
            <CHSContainer>
                <CHSContent ref='scroll'>
                    <AppHeader title={title}
                               func={() => this.onAppHeaderBack(this.state.saveDrafts)} displayHomePressWarning={!this.state.saveDrafts}/>
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.individual.latestEntityApprovalStatus}/>
                    <View style={{
                        marginTop: Distances.ScaledVerticalSpacingDisplaySections,
                        flexDirection: 'column',
                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                    }}>
                        <GeolocationFormElement
                            actionName={Actions.REGISTRATION_SET_LOCATION}
                            errorActionName={Actions.SET_LOCATION_ERROR}
                            location={this.state.individual.registrationLocation}
                            editing={editing}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_LOCATION)}/>
                        <RegistrationDateFormElement state={this.state}/>
                        <IndividualNameFormElement state={this.state}/>
                        <SingleSelectMediaFormElement
                            element={{...profilePicFormElement}}
                            value={new PrimitiveValue(this.state.individual.profilePicture)}
                            isShown={this.state.isAllowedProfilePicture}
                            actionName={Actions.REGISTRATION_SET_PROFILE_PICTURE}/>
                        <DateOfBirthAndAgeFormElement state={this.state}/>
                        <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.state, HouseholdState.validationKeys.RELATIVE_AGE)}/>
                        <GenderFormElement state={this.state}/>
                        <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.state, HouseholdState.validationKeys.RELATIVE_GENDER)}/>
                        <AddressLevels
                            selectedLowestLevel={this.state.individual.lowestAddressLevel}
                            multiSelect={false}
                            validationError={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.LOWEST_ADDRESS_LEVEL)}
                            mandatory={true}
                            onLowestLevel={(lowestSelectedAddresses) =>
                                this.dispatchAction(Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, {value: _.head(lowestSelectedAddresses)})}
                            minLevelTypeUUIDs={this.state.minLevelTypeUUIDs}
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
