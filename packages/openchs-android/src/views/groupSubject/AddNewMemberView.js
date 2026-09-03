import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import React from "react";
import PropTypes from "prop-types";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";
import Reducers from "../../reducer";
import {AddNewMemberActions as Actions, MemberAction} from "../../action/groupSubject/MemberAction";
import {Alert, Text, ToastAndroid, TouchableOpacity, View, ScrollView} from "react-native";
import Styles from "../primitives/Styles";
import IndividualFormElement from "../form/formElement/IndividualFormElement";
import _ from "lodash";
import StaticFormElement from "../viewmodel/StaticFormElement";
import WizardButtons from "../common/WizardButtons";
import Colors from "../primitives/Colors";
import AddMemberDetails from "./AddMemberDetails";
import SelectedMembersList from "./SelectedMembersList";
import {IndividualRelative, WorkItem, WorkList, WorkLists} from "avni-models";
import TypedTransition from "../../framework/routing/TypedTransition";
import GenericDashboardView from "../program/GenericDashboardView";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import WorkListState from "../../state/WorkListState";
import WorklistsFactory from "../../model/WorklistsFactory";

@Path('/addNewMemberView')
class AddNewMemberView extends AbstractComponent {

    static propTypes = {
        groupSubject: PropTypes.object,
        message: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addNewMember);
    }

    get nextAndMore() {
        const workLists = this.props.workLists;
        if (_.isNil(workLists)) return {};
        const workListState = new WorkListState(this.updateWorkList(), _.noop);
        if (!workListState.peekNextWorkItem()) return {};
        const workItemLabel = workListState.saveAndProceedButtonLabel(this.I18n);
        return {
            label: workItemLabel,
            func: () => this.save(() => {
                CHSNavigator.performNextWorkItemFromRecommendationsView(this, workListState, this.context);
            }),
            visible: this.state.validationResults.length === 0,
        };
    }

    viewName() {
        return 'AddNewMemberView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !this.state.workListUpdated;
    }

    previous() {
        CHSNavigator.goBack(this);
    }

    displayMessage(message) {
        if (message && this.state.messageDisplayed) {
            ToastAndroid.show(this.I18n.t(message), ToastAndroid.SHORT);
            this.dispatchAction(Actions.DISPLAY_MESSAGE)
        }
    }

    save(cb) {
        if (this.isBulkAdd()) {
            return this.saveSelection(cb);
        }
        if (this.state.member.memberSubject.voided) {
            Alert.alert(this.I18n.t("voidedIndividualAlertTitle"),
              this.I18n.t("voidedIndividualAlertMessage"));
        } else if (!_.isEmpty(this.state.validationResults)) {
            Alert.alert(this.I18n.t("validationResult"),
              this.I18n.t(this.state.validationResults[0].messageKey));
        } else {
            this.dispatchAction(Actions.ON_SAVE, {cb});
        }
    }

    isBulkAdd() {
        return this.state.bulkAddEnabled && !_.isEmpty(this.state.selectedMembers);
    }

    // Nothing here removes a row on the user's behalf: cancelling leaves the selection as it was.
    saveSelection(cb) {
        // Role and start date are shared by the batch, and the start date can be cleared after the
        // members are picked. Saving past that would write every row with no membershipStartDate.
        if (!_.isEmpty(this.state.validationResults)) {
            return Alert.alert(this.I18n.t("validationResult"),
              this.I18n.t(this.state.validationResults[0].messageKey));
        }
        const selected = this.state.selectedMembers;
        const blocked = _.filter(selected, ({validationResults}) => !_.isEmpty(validationResults));
        const eligible = selected.length - blocked.length;
        if (eligible === 0) {
            return Alert.alert(this.I18n.t("validationResult"),
              this.I18n.t(_.head(_.head(blocked).validationResults).messageKey));
        }
        if (_.isEmpty(blocked)) {
            return this.dispatchAction(Actions.ON_SAVE, {cb});
        }
        Alert.alert(this.I18n.t("someMembersCannotBeAdded"),
          this.I18n.t("someMembersCannotBeAddedDescription",
            {skipped: blocked.length, total: selected.length, eligible}),
          [
              {text: this.I18n.t("cancel"), style: "cancel"},
              {text: this.I18n.t("addNMembers", {count: eligible}), onPress: () => this.dispatchAction(Actions.ON_SAVE, {cb})}
          ]);
    }

    savedMessage(savedCount) {
        return _.isNil(savedCount) || savedCount === 1
            ? this.I18n.t('newMemberAddedMsg')
            : this.I18n.t('membersAddedMsg', {count: savedCount});
    }

    // What the role still has room for, or null when it declares no cap. Deliberately not clamped
    // to the batch limit - the two are different things and only one of them is about the role.
    roleHeadroom() {
        const groupRole = this.state.member.groupRole;
        const maximumNumberOfMembers = groupRole.maximumNumberOfMembers;
        if (!_.isFinite(maximumNumberOfMembers)) return null;
        const existing = _.get(this.state.existingMemberCountByRoleUUID, groupRole.uuid, 0);
        return Math.max(maximumNumberOfMembers - existing, 0);
    }

    selectionLimit() {
        const headroom = this.roleHeadroom();
        return _.isNil(headroom) ? MemberAction.MAX_BULK_SELECTION
            : Math.min(headroom, MemberAction.MAX_BULK_SELECTION);
    }

    selectionLimitMessage() {
        const headroom = this.roleHeadroom();
        return this.selectionLimit() === headroom
            ? this.I18n.t('maxLimitReachedMsg')
            : this.I18n.t('tooManyMembersSelected', {max: MemberAction.MAX_BULK_SELECTION});
    }

    renderRegistrationButton(memberSubjectType, regText) {
        return <View style={{flexDirection: 'column', alignItems: 'center', alignSelf: 'center'}}>
            <Text>{this.I18n.t('or')}</Text>
            <TouchableOpacity
                style={{
                    marginTop: 20,
                    paddingVertical: 10,
                    backgroundColor: Colors.ActionButtonColor,
                    borderRadius: 15
                }}
                activeOpacity={.5}
                onPress={() => this.proceedToRegistration(memberSubjectType)}>
                <Text style={{
                    color: Colors.TextOnPrimaryColor,
                    textAlign: 'center',
                    paddingHorizontal: 40
                }}>{this.I18n.t('proceedRegistration', {member: regText})}</Text>
            </TouchableOpacity>
        </View>
    }

    next() {
        if (_.isNil(this.props.params)) {
            const cb = (savedCount) => TypedTransition.from(this).resetStack([AddNewMemberView, GenericDashboardView],
                [TypedTransition.createRoute(GenericDashboardView, {
                    individualUUID: this.state.member.groupSubject.uuid,
                    message: this.savedMessage(savedCount),
                    tab: 1
                })]);
            return this.save(cb);
        } else {
            const memberSubject = this.state.member.memberSubject;
            if (this.state.member.memberSubject.voided) {
                Alert.alert(this.I18n.t("voidedIndividualAlertTitle"),
                  this.I18n.t("voidedIndividualAlertMessage"));
            } else if (!_.isEmpty(this.state.validationResults)) {
                Alert.alert(this.I18n.t("validationResult"),
                  this.I18n.t(this.state.validationResults[0].messageKey));
            } else {
                CHSNavigator.navigateToRegisterView(this, {workLists: WorklistsFactory.createForAddMemberWizardLastPage(memberSubject, this.state.member, this.state.individualRelative, this.isHeadOfHousehold(), this.state.relativeGender)});
            }
        }
    }

    proceedToRegistration(subjectType) {
        const workLists = WorklistsFactory.createForAddMemberStart(subjectType, this.state.member, this.state.individualRelative, this.isHeadOfHousehold(), this.state.relativeGender);
        CHSNavigator.navigateToRegisterView(this, {workLists, groupSubjectUUID: this.state.member.groupSubject.uuid});
    }

    updateWorkList() {
        const subjectType = this.state.member.groupRole.memberSubjectType;
        const workLists = this.props.workLists;
        workLists.addParamsToCurrentWorkList({
            subjectTypeName: subjectType.name,
            member: this.state.member,
            individualRelative: this.state.individualRelative,
            relativeGender: this.state.relativeGender,
            headOfHousehold: this.isHeadOfHousehold(),
        });
        return workLists;
    }

    isHeadOfHousehold() {
        return this.state.member.groupSubject.isHousehold() && this.state.member.groupRole.isHeadOfHousehold;
    }

    isMemberDetailsEmpty() {
        return _.isEmpty(this.state.member.groupRole) || _.isEmpty(this.state.member.membershipStartDate)
            || (this.state.member.groupSubject.isHousehold() && !this.isHeadOfHousehold() && _.isEmpty(this.state.individualRelative.relation.uuid));
    }

    displaySearchOption() {
        return !this.isMemberDetailsEmpty();
    }

    displayRegistrationOption() {
        return _.isEmpty(this.state.member.memberSubject)
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const headerMessage = `${this.I18n.t(this.state.member.groupSubject.name)} - ${this.I18n.t('addMember')}`;
        const searchHeaderMessage = `${headerMessage} - ${this.I18n.t('search')}`;
        this.displayMessage(this.props.message);
        const nextLabel = _.isNil(this.props.params) ? 'save' : 'next';
        const groupRole = this.state.member.groupRole;
        const bulkAdd = this.state.bulkAddEnabled;
        const selectedMembers = this.state.selectedMembers;
        const hasSelection = bulkAdd ? !_.isEmpty(selectedMembers) : !_.isEmpty(this.state.member.memberSubject);
        const title = groupRole.role ? this.I18n.t('addMemberRole', {role: groupRole.role}) : this.I18n.t('addNewMember');
        const regText = groupRole.memberSubjectType && groupRole.memberSubjectType.name;
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={title}/>
                    <ScrollView style={{
                        marginTop: Styles.ContentDistanceFromEdge,
                        paddingHorizontal: Styles.ContentDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        <AddMemberDetails/>
                        {this.displaySearchOption() &&
                        <View>
                            <IndividualFormElement
                                individualNameValue={bulkAdd || _.isNil(this.state.member.memberSubject.name) ? "" : this.state.member.memberSubject.name}
                                element={new StaticFormElement(bulkAdd ? 'groupMembers' : 'groupMember', true)}
                                inputChangeActionName={Actions.ON_MEMBER_SELECT}
                                searchHeaderMessage={searchHeaderMessage}
                                hideIcon={!_.isNil(this.props.params)}
                                displayText={!hasSelection}
                                regText={regText}
                                memberSubjectType={this.state.member.groupRole.memberSubjectType}
                                multiSelect={bulkAdd}
                                multiSelectActionName={Actions.ON_MEMBERS_SELECT}
                                preSelectedMembers={_.map(selectedMembers, 'memberSubject')}
                                excludedSubjectUUIDs={bulkAdd ? this.state.excludedMemberUUIDs : undefined}
                                maxSelectable={bulkAdd ? this.selectionLimit() : undefined}
                                selectionFullMessage={this.selectionLimitMessage()}
                                validationResult={AbstractDataEntryState.getValidationError(this.state, 'GROUP_MEMBER')}/>
                            {bulkAdd &&
                            <SelectedMembersList selectedMembers={selectedMembers}
                                                 roleCapacityRemaining={_.isNil(this.roleHeadroom()) ? null : this.roleHeadroom() - selectedMembers.length}
                                                 onRemove={(memberSubjectUUID) => this.dispatchAction(Actions.ON_MEMBER_REMOVE, {memberSubjectUUID})}/>}
                            <ValidationErrorMessage
                                validationResult={AbstractDataEntryState.getValidationError(this.state, IndividualRelative.validationKeys.RELATIVE)}/>
                            {this.displayRegistrationOption() &&
                            this.renderRegistrationButton(this.state.member.groupRole.memberSubjectType, regText)}
                        </View>
                        }
                        {hasSelection &&
                        <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                       next={{func: () => this.next(), label: this.I18n.t(nextLabel)}}
                                       nextAndMore={this.nextAndMore}
                                       style={{marginHorizontal: 24}}/>
                        }
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default AddNewMemberView;
