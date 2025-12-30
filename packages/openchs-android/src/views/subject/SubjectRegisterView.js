import {ScrollView, Text, TextInput, ToastAndroid, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import {Actions} from "../../action/subject/SubjectRegisterActions";
import WizardButtons from "../common/WizardButtons";
import SubjectRegisterViewsMixin from "./SubjectRegisterViewsMixin";
import {Individual, PrimitiveValue, SingleCodedValue, SubjectType, WorkItem} from "avni-models";
import CHSNavigator from "../../utility/CHSNavigator";
import StaticFormElement from "../viewmodel/StaticFormElement";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import DateFormElement from "../../views/form/formElement/DateFormElement";
import _ from "lodash";
import General from "../../utility/General";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import TextFormElement from "../form/formElement/TextFormElement";
import AddressLevels from "../common/AddressLevels";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import IdentifierAssignmentService from "../../service/IdentifierAssignmentService";
import FormMappingService from "../../service/FormMappingService";
import EntityService from "../../service/EntityService";
import Colors from "../primitives/Colors";
import DGS from "../primitives/DynamicGlobalStyles";
import HouseholdState from "../../state/HouseholdState";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import UserInfoService from "../../service/UserInfoService";
import SingleSelectMediaFormElement from "../form/formElement/SingleSelectMediaFormElement";

@Path('/SubjectRegisterView')
class SubjectRegisterView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.subject);
        this.formRow = {marginTop: Distances.ScaledVerticalSpacingBetweenFormElements};
        let currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        let subjectTypeName = currentWorkItem.parameters.subjectTypeName;
        const subjectType = context.getService(EntityService).findByKey('name', subjectTypeName, SubjectType.schema.name);
        this.state = {displayed: true, isAllowedProfilePicture: subjectType.allowProfilePicture};
        this.scrollRef = React.createRef();
    }


    viewName() {
        return 'SubjectRegisterView';
    }

    getTitleForGroupSubject() {
        const currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        if (_.includes([WorkItem.type.HOUSEHOLD, WorkItem.type.ADD_MEMBER], currentWorkItem.type)) {
            const {headOfHousehold} = currentWorkItem.parameters;
            return headOfHousehold ? 'headOfHouseholdReg' : 'memberReg';
        }
    }

    getTitleForSubjectRegistration() {
        const currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        if (_.includes([WorkItem.type.REGISTRATION], currentWorkItem.type)) {
            const {name, subjectTypeName} = currentWorkItem.parameters;
            return name || subjectTypeName;
        }
    }

    get registrationType() {
        const workListName = _.get(this, 'props.params.workLists.currentWorkList.name');
        return this.getTitleForGroupSubject() || this.getTitleForSubjectRegistration() || workListName || `REG_DISPLAY-${this.state.subject.subjectType.name}`;
    }

    static canLoad({uuid, customMessage, subjectTypeName}, parent) {
        const editing = !_.isNil(uuid);
        if (editing) return true;
        const identifierAssignmentService = parent.context.getService(IdentifierAssignmentService);
        const entityService = parent.context.getService(EntityService);
        const subjectType = entityService.findByKey('name', subjectTypeName, SubjectType.schema.name);

        const formMappingService = parent.context.getService(FormMappingService);
        const form = formMappingService.findRegistrationForm(subjectType);


        if (identifierAssignmentService.haveEnoughIdentifiers(form)) {
            return true;
        }
        parent.handleError({syncRequiredError: customMessage || 'NotEnoughId'});
        return false;
    }

    UNSAFE_componentWillMount() {
        const params = this.props.params;
        this.dispatchAction(Actions.ON_LOAD, {
            subjectUUID: params.subjectUUID,
            groupSubjectUUID: params.groupSubjectUUID,
            workLists: params.workLists,
            isDraftEntity: params.isDraftEntity,
            pageNumber: params.pageNumber,
            taskUuid: params.taskUuid,
            onCompletion: (newState) => {
                this.dispatchAction(Actions.USE_THIS_STATE, {state: newState});
            }
        });
        return super.UNSAFE_componentWillMount();
    }

    onAppHeaderBack(saveDraftOn) {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [SubjectRegisterView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t(saveDraftOn ? 'backPressMessageSinglePage' : 'backPressMessage'), onYesPress, this.I18n);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.wizard && nextState.wizard.isNonFormPage();
    }

    displayMessage(message) {
        if (message && this.state.displayed) {
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.setState({displayed: false});
        }
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        {
            this.displayMessage(this.props.message)
        }
        const profilePicFormElement = new StaticFormElement("profilePicture", false, 'Profile-Pics', []);
        const title = `${this.I18n.t(this.registrationType)} ${this.I18n.t('registration')}`;
        return (
            <CHSContainer>
                <CHSContent>
                    <ScrollView keyboardShouldPersistTaps="handled"
                                ref={this.scrollRef} style={{
                        marginTop: Distances.ScaledVerticalSpacingDisplaySections,
                        flexDirection: 'column',
                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                    }}>
                    <AppHeader title={title}
                           func={() => this.onAppHeaderBack(this.state.saveDrafts)}
                           displayHomePressWarning={!this.state.saveDrafts}/>
                        <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.subject.latestEntityApprovalStatus}/>

                        <GeolocationFormElement
                            actionName={Actions.SET_LOCATION}
                            errorActionName={Actions.SET_LOCATION_ERROR}
                            location={this.state.subject.registrationLocation}
                            editing={this.props.params.editing}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_LOCATION)}/>
                        <DateFormElement actionName={Actions.REGISTRATION_ENTER_REGISTRATION_DATE}
                                         element={new StaticFormElement('registrationDate')}
                                         dateValue={new PrimitiveValue(this.state.subject.registrationDate)}
                                         validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_DATE)}/>
                        <TextFormElement actionName={Actions.REGISTRATION_ENTER_NAME}
                                         element={new StaticFormElement(`${this.state.subject.subjectTypeName} Name`, true)}
                                         validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.FIRST_NAME)}
                                         value={new PrimitiveValue(this.state.subject.firstName)}
                                         style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                                         multiline={false}
                                         helpText={_.get(this.state.subject, 'subjectType.nameHelpText')}
                        />
                        <SingleSelectMediaFormElement
                            element={{...profilePicFormElement}}
                            value={new SingleCodedValue(this.state.subject.profilePicture)}
                            isShown={this.state.isAllowedProfilePicture}
                            actionName={Actions.SET_PROFILE_PICTURE}/>
                        <ValidationErrorMessage
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.nonIndividualValidationKeys.NAME)}/>
                        {this.state.subject.isHousehold() && this.state.isNewEntity &&
                        <View>
                            <View>
                                <Text style={DGS.formElementLabel}>{this.I18n.t("totalMembers")}<Text
                                    style={{color: Colors.ValidationError}}> * </Text></Text>
                            </View>
                            <TextInput
                                style={{flex: 1, borderBottomWidth: 0, marginTop: Distances.VerticalSpacingBetweenFormElements, paddingVertical: 5}}
                                keyboardType='numeric'
                                maxLength={3}
                                underlineColorAndroid={AbstractDataEntryState.hasValidationError(this.state, HouseholdState.validationKeys.TOTAL_MEMBERS) ? Colors.ValidationError : Colors.InputBorderNormal}
                                value={_.isNil(this.state.household.totalMembers) ? "" : this.state.household.totalMembers}
                                onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_TOTAL_MEMBERS, {value: text})}/>

                        </View>}
                        <AddressLevels
                            selectedLowestLevel={this.state.subject.lowestAddressLevel}
                            multiSelect={false}
                            validationError={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.LOWEST_ADDRESS_LEVEL)}
                            mandatory={true}
                            onLowestLevel={(lowestSelectedAddresses) => {
                                this.dispatchAction(Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, {value: _.head(lowestSelectedAddresses)})
                            }
                            }
                            minLevelTypeUUIDs={this.state.minLevelTypeUUIDs}
                        />
                        <WizardButtons next={{func: () => SubjectRegisterViewsMixin.next(this), label: this.I18n.t('next')}}/>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SubjectRegisterView;
