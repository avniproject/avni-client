import {ScrollView, Text, TextInput, ToastAndroid, Vibration, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import {Actions} from "../../action/subject/SubjectRegisterActions";
import FormElementGroup from "../form/FormElementGroup";
import WizardButtons from "../common/WizardButtons";
import {AbstractEncounter, Individual, ObservationsHolder, PrimitiveValue, SubjectType, WorkItem, SingleCodedValue} from "avni-models";
import CHSNavigator from "../../utility/CHSNavigator";
import StaticFormElement from "../viewmodel/StaticFormElement";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import DateFormElement from "../../views/form/formElement/DateFormElement";
import _ from "lodash";
import TypedTransition from "../../framework/routing/TypedTransition";
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
import {Button, Text as NBText} from "native-base";
import SummaryButton from "../common/SummaryButton";
import UserInfoService from "../../service/UserInfoService";
import SingleSelectMediaFormElement from "../form/formElement/SingleSelectMediaFormElement";
import Timer from "../common/Timer";
import BackgroundTimer from "react-native-background-timer";

@Path('/SubjectRegisterView')
class SubjectRegisterView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.subject);
        let currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        let subjectTypeName = currentWorkItem.parameters.subjectTypeName;
        const subjectType = context.getService(EntityService).findByKey('name', subjectTypeName, SubjectType.schema.name);
        this.state = {displayed:true, isAllowedProfilePicture: subjectType.allowProfilePicture};
        this.scrollRef = React.createRef();
    }

    getTitleForGroupSubject() {
        const currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        if (_.includes([WorkItem.type.HOUSEHOLD, WorkItem.type.ADD_MEMBER], currentWorkItem.type)) {
            const {headOfHousehold} = currentWorkItem.parameters;
            return headOfHousehold ? 'headOfHouseholdReg' : 'memberReg';
        }
    }

    get registrationType() {
        const workListName = _.get(this, 'props.params.workLists.currentWorkList.name');
        return this.getTitleForGroupSubject() || workListName || `REG_DISPLAY-${this.state.subject.subjectType.name}`;
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

    viewName() {
        return 'SubjectRegisterView';
    }

    UNSAFE_componentWillMount() {
        const params = this.props.params;
        this.dispatchAction(Actions.ON_LOAD, {
            subjectUUID: params.subjectUUID,
            groupSubjectUUID: params.groupSubjectUUID,
            workLists: params.workLists,
            isDraftEntity: params.isDraftEntity,
            pageNumber: params.pageNumber,
            taskUuid: params.taskUuid
        });
        return super.UNSAFE_componentWillMount();
    }

    previous() {
        if (this.state.wizard.isFirstFormPage())
            TypedTransition.from(this).goBack();
        else
            this.dispatchAction(Actions.PREVIOUS, {cb: this.scrollToTop});
    }

    onAppHeaderBack(saveDraftOn) {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [SubjectRegisterView]);
        saveDraftOn ? onYesPress() : AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    getNextParams(popVerificationVew) {
        const phoneNumberObservation = _.find(this.state.subject.observations, obs => obs.isPhoneNumberVerificationRequired(this.state.filteredFormElements));
        return {
            completed: (state, decisions, ruleValidationErrors, checklists, nextScheduledVisits, context) => {
                const observations = state.subject.observations;
                const onSaveCallback = (source) => {
                    CHSNavigator.navigateToProgramEnrolmentDashboardView(source, state.subject.uuid, null, true, null, this.I18n.t('registrationSavedMsg'), 1);
                };
                const registrationTitle = this.I18n.t(this.registrationType) + this.I18n.t('registration');
                const headerMessage = `${registrationTitle} - ${this.I18n.t('summaryAndRecommendations')}`;
                CHSNavigator.navigateToSystemsRecommendationView(this, decisions, ruleValidationErrors, state.subject, observations, Actions.SAVE, onSaveCallback, headerMessage,
                    null, nextScheduledVisits, state.form, state.workListState, null, this.state.saveDrafts, popVerificationVew, state.subject.isRejectedEntity(), this.state.subject.latestEntityApprovalStatus);
            },
            popVerificationVewFunc: () => TypedTransition.from(this).popToBookmark(),
            phoneNumberObservation,
            popVerificationVew,
            verifyPhoneNumber: (observation) => CHSNavigator.navigateToPhoneNumberVerificationView(this, this.next.bind(this), observation, () => this.dispatchAction(Actions.ON_SUCCESS_OTP_VERIFICATION, {observation}), () => this.dispatchAction(Actions.ON_SKIP_VERIFICATION, {
                observation,
                skipVerification: true
            })),
            movedNext: this.scrollToTop
        }
    }

    next(popVerificationVew) {
        this.dispatchAction(Actions.NEXT, this.getNextParams(popVerificationVew));
    }

    onGoToSummary() {
        this.dispatchAction(Actions.SUMMARY_PAGE, this.getNextParams(false))
    }


    shouldComponentUpdate(nextProps, nextState) {
        return !_.isNil(nextState.subject);
    }

    displayMessage(message) {
        if (message && this.state.displayed) {
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.setState({displayed: false});
        }
    }

    onStartTimer() {
        this.dispatchAction(Actions.ON_START_TIMER,
            {
                cb: () => BackgroundTimer.runBackgroundTimer(
                    () => this.dispatchAction(Actions.ON_TIMED_FORM,
                        {
                            vibrate: (pattern) => Vibration.vibrate(pattern),
                            nextParams: this.getNextParams(false),
                            //https://github.com/ocetnik/react-native-background-timer/issues/310#issuecomment-1169621884
                            stopTimer: () => setTimeout(() => BackgroundTimer.stopBackgroundTimer(), 0)
                        }),
                    1000
                )
            })
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        {this.displayMessage(this.props.message)}
        const profilePicFormElement = new StaticFormElement("profilePicture", false, 'Profile-Pics', []);
        const title = this.I18n.t(this.registrationType) + this.I18n.t('registration');
        const subjectType = this.state.subject.subjectType;
        const userInfoService = this.context.getService(UserInfoService);
        const displayTimer = this.state.timerState && this.state.timerState.displayTimer(this.state.formElementGroup);
        return (
            <CHSContainer>
                <CHSContent>
                    <ScrollView ref={this.scrollRef}>
                    <AppHeader title={title}
                               func={() => this.onAppHeaderBack(this.state.saveDrafts)}
                               displayHomePressWarning={!this.state.saveDrafts}/>
                    {displayTimer ?
                        <Timer timerState={this.state.timerState} onStartTimer={() => this.onStartTimer()} group={this.state.formElementGroup}/> : null}
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.subject.latestEntityApprovalStatus}/>
                    <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        <SummaryButton onPress={() => this.onGoToSummary()}/>
                        {this.state.wizard.isFirstFormPage() && (
                            <View>
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
                                <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.nonIndividualValidationKeys.NAME)}/>
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

                            </View>
                        )}
                    </View>
                    <View style={{backgroundColor: '#ffffff', flexDirection: 'column'}}>
                        {_.get(this.state, 'timerState.displayQuestions', true) &&
                            <FormElementGroup
                            observationHolder={new ObservationsHolder(this.state.subject.observations)}
                            group={this.state.formElementGroup}
                            actions={Actions}
                            validationResults={this.state.validationResults}
                            filteredFormElements={this.state.filteredFormElements}
                            formElementsUserState={this.state.formElementsUserState}
                            dataEntryDate={this.state.subject.registrationDate}
                            onValidationError={(x, y) => this.scrollToPosition(x, y)}
                            groupAffiliation={this.state.groupAffiliation}
                            syncRegistrationConcept1UUID={subjectType.syncRegistrationConcept1}
                            syncRegistrationConcept2UUID={subjectType.syncRegistrationConcept2}
                            allowedSyncConcept1Values={userInfoService.getSyncConcept1Values(subjectType)}
                            allowedSyncConcept2Values={userInfoService.getSyncConcept2Values(subjectType)}
                        />}
                        {!displayTimer &&
                        <WizardButtons previous={{
                            func: () => this.previous(),
                            visible: !this.state.wizard.isFirstPage(),
                            label: this.I18n.t('previous')
                        }} next={{
                            func: () => this.next(),
                            label: this.I18n.t('next')
                        }}/>}
                    </View>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SubjectRegisterView;
