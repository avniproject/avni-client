import {Button, ToastAndroid, ScrollView, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import AddressLevels from "../common/AddressLevels";
import {Actions, PersonRegisterActions} from "../../action/individual/PersonRegisterActions";
import _ from "lodash";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import WizardButtons from "../common/WizardButtons";
import {Individual, WorkItem, SingleCodedValue, SubjectType} from 'avni-models';
import General from "../../utility/General";
import PersonRegisterViewsMixin from "./PersonRegisterViewsMixin";
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
import SingleSelectMediaFormElement from "../form/formElement/SingleSelectMediaFormElement";
import StaticFormElement from "../viewmodel/StaticFormElement";
import EntityService from "../../service/EntityService";
import BackgroundDraftSaver from "../common/BackgroundDraftSaver";
import Colors from "../primitives/Colors";
import AbhaRegistrationFlow from "../abha/AbhaRegistrationFlow";
import AbhaRegistrationOptions from "../abha/AbhaRegistrationOptions";
import AbhaConsentDialog from "../abha/AbhaConsentDialog";
import AbhaReplaceDetailsDialog from "../abha/AbhaReplaceDetailsDialog";

@Path('/personRegister')
class PersonRegisterView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.personRegister);
        this.formRow = {marginTop: Distances.ScaledVerticalSpacingBetweenFormElements};
        let currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        let subjectTypeName = currentWorkItem.parameters.subjectTypeName;
        const subjectType = context.getService(EntityService).findByKey('name', subjectTypeName, SubjectType.schema.name);
        this.state = {displayed:true, isAllowedProfilePicture: subjectType.allowProfilePicture};
        this.scrollRef = React.createRef();
        this.abhaFlow = new AbhaRegistrationFlow(this);
    }

    viewName() {
        return 'PersonRegisterView';
    }

    onViewDidMount() {
        this.backgroundDraftSaver = new BackgroundDraftSaver(this, Actions.ON_APP_BACKGROUND);
        this.backgroundDraftSaver.start();
    }

    componentWillUnmount() {
        this.backgroundDraftSaver && this.backgroundDraftSaver.stop();
        super.componentWillUnmount();
    }

    getTitleForGroupSubject(){
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
        const regName = workListName === 'Enrolment' ? _.get(_.find(this.props.params.workLists.currentWorkList.workItems, wl => wl.type === 'PROGRAM_ENROLMENT'), "parameters.programName") : workListName;
        return this.getTitleForGroupSubject() || this.getTitleForSubjectRegistration() || regName || 'REG_DISPLAY-Individual';
    }

    // Deferred out of willMount: this dispatch builds the form's initial state and blocks the JS
    // thread, which starved the navigation slide (avni-client#2054). The base class runs it once the
    // scene transition has painted and shows renderLoading() until then, so the form is never drawn
    // half-built. Same rules, same order, same result - only when it runs changes.
    loadData() {
        const params = this.props.params;
        this.dispatchAction(Actions.ON_LOAD,
            {
                individualUUID: params.individualUUID,
                groupSubjectUUID: params.groupSubjectUUID,
                workLists: params.workLists,
                isDraftEntity: params.isDraftEntity,
                pageNumber: params.pageNumber,
                taskUuid: params.taskUuid,
                onCompletion: (newState) => {
                    this.dispatchAction(Actions.USE_THIS_STATE, {state: newState});
                }
            });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.wizard && nextState.wizard.isNonFormPage();
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
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [PersonRegisterView]);
        AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t(saveDraftOn ? 'backPressMessageSinglePage' : 'backPressMessage'), onYesPress, this.I18n);
    }

    // The ABHA step's dialogs. Each resolves the promise the ABHA flow is waiting on.
    askAbhaConsent(text) {
        return this.showAbhaDialog({kind: 'consent', text});
    }

    askAbhaReplace(rows) {
        return this.showAbhaDialog({kind: 'replace', rows});
    }

    showAbhaDialog(abhaDialog) {
        return new Promise((resolve) => {
            this.resolveAbhaDialog = resolve;
            this.setState({abhaDialog});
        });
    }

    closeAbhaDialog(result) {
        const resolve = this.resolveAbhaDialog;
        this.resolveAbhaDialog = null;
        this.setState({abhaDialog: null});
        resolve && resolve(result);
    }

    // Nothing shows unless the organisation has ABHA on and the user has a health centre.
    renderAbha() {
        const abha = this.state.abha;
        if (!_.get(abha, 'enabledForUser')) return null;
        const dialog = this.state.abhaDialog;
        return (
            <View>
                {PersonRegisterActions.abhaOptionsShown(abha) &&
                <AbhaRegistrationOptions onCreate={() => this.abhaFlow.open({route: 'create'})}
                                         onLink={() => this.abhaFlow.open({route: 'link'})}
                                         onWithout={() => this.abhaFlow.chooseWithout()}/>}
                {this.props.params.editing && abha.linked &&
                <View style={this.formRow}>
                    <Button title={this.I18n.t('abhaRemoveLink')} color={Colors.ActionButtonColor}
                            onPress={() => AvniAlert(this.I18n.t('abhaRemoveLink'), this.I18n.t('abhaRemoveLinkConfirm'),
                                () => this.dispatchAction(Actions.ON_ABHA_LINK_REMOVED, {}), this.I18n, true)}/>
                </View>}
                {_.get(dialog, 'kind') === 'consent' &&
                <AbhaConsentDialog text={dialog.text} onContinue={(agreedAt) => this.closeAbhaDialog(agreedAt)}
                                   onDecline={() => this.closeAbhaDialog(null)}/>}
                {_.get(dialog, 'kind') === 'replace' &&
                <AbhaReplaceDetailsDialog rows={dialog.rows} onApply={() => this.closeAbhaDialog(true)}
                                          onCancel={() => this.closeAbhaDialog(false)}/>}
            </View>
        );
    }

    renderLoaded() {
        General.logDebug(this.viewName(), `render`);
        const profilePicFormElement = new StaticFormElement("profilePicture", false, 'Profile-Pics', []);
        // A verified ABHA (one with an ABHA number) holds name, date of birth and gender as Aadhaar has them.
        const locked = !!_.get(this.state, 'abha.locked');
        const title = `${this.I18n.t(this.registrationType)} ${this.I18n.t('registration')}`;
        {this.displayMessage(this.props.params.message)}
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={title}
                               func={() => this.onAppHeaderBack(this.state.saveDrafts)} displayHomePressWarning={!this.state.saveDrafts}/>
                    <ScrollView keyboardShouldPersistTaps="handled"
                        ref={this.scrollRef} style={{
                        marginTop: Distances.ScaledVerticalSpacingDisplaySections,
                        flexDirection: 'column',
                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                    }}>
                        {this.renderAbha()}
                        <GeolocationFormElement
                            actionName={Actions.REGISTRATION_SET_LOCATION}
                            errorActionName={Actions.SET_LOCATION_ERROR}
                            location={this.state.individual.registrationLocation}
                            editing={this.props.params.editing}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_LOCATION)}/>
                        <RegistrationDateFormElement date={this.state.individual.registrationDate}
                                                     validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_DATE)}
                        />
                        <IndividualNameFormElement state={this.state} locked={locked}/>
                        <SingleSelectMediaFormElement
                            element={{...profilePicFormElement}}
                            value={new SingleCodedValue(this.state.individual.profilePicture)}
                            isShown={this.state.isAllowedProfilePicture}
                            actionName={Actions.REGISTRATION_SET_PROFILE_PICTURE}/>
                        <DateOfBirthAndAgeFormElement state={this.state} locked={locked}/>
                        <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.state, HouseholdState.validationKeys.RELATIVE_AGE)}/>
                        <GenderFormElement state={this.state} locked={locked}/>
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
                            next={{func: () => PersonRegisterViewsMixin.next(this), label: this.I18n.t('next')}}/>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default PersonRegisterView;
