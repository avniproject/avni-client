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
import {AddNewMemberActions as Actions} from "../../action/groupSubject/MemberAction";
import {Alert, Text, ToastAndroid, TouchableOpacity, View} from "react-native";
import Styles from "../primitives/Styles";
import IndividualFormElement from "../form/formElement/IndividualFormElement";
import _ from "lodash";
import StaticFormElement from "../viewmodel/StaticFormElement";
import WizardButtons from "../common/WizardButtons";
import Colors from "../primitives/Colors";
import AddMemberDetails from "./AddMemberDetails";
import {IndividualRelative, WorkItem, WorkList, WorkLists} from "avni-models";
import TypedTransition from "../../framework/routing/TypedTransition";
import GenericDashboardView from "../program/GenericDashboardView";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import WorkListState from "../../state/WorkListState";

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

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.componentWillMount();
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
        if (this.state.member.memberSubject.voided) {
            Alert.alert(this.I18n.t("voidedIndividualAlertTitle"),
                this.I18n.t("voidedIndividualAlertMessage"));
        } else {
            this.dispatchAction(Actions.ON_SAVE, {cb});
        }
    }

    renderRegistrationButton(memberSubjectType) {
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
                }}>{this.I18n.t('proceedRegistration', {member: this.state.member.groupRole.role})}</Text>
            </TouchableOpacity>
        </View>
    }

    next() {
        if (_.isNil(this.props.params)) {
            const cb = () => TypedTransition.from(this).resetStack([AddNewMemberView, GenericDashboardView],
                [TypedTransition.createRoute(GenericDashboardView, {
                    individualUUID: this.state.member.groupSubject.uuid,
                    message: this.I18n.t('newMemberAddedMsg'),
                    tab: 1
                })]);
            return this.save(cb);
        } else {
            const memberSubject = this.state.member.memberSubject;
            CHSNavigator.navigateToRegisterView(this, new WorkLists(new WorkList(`${memberSubject.subjectType.name} `,
                [new WorkItem(General.randomUUID(), WorkItem.type.ADD_MEMBER,
                    {
                        uuid: memberSubject.uuid,
                        subjectTypeName: memberSubject.subjectType.name,
                        member: this.state.member,
                        individualRelative: this.state.individualRelative,
                        headOfHousehold: this.isHeadOfHousehold(),
                    }
                )])));
        }
    }

    proceedToRegistration(subjectType) {
        const params = {
            subjectTypeName: subjectType.name,
            member: this.state.member,
            groupSubjectUUID: this.state.member.groupSubject.uuid,
            individualRelative: this.state.individualRelative,
            headOfHousehold: this.isHeadOfHousehold(),
        };
        const updatedWorkLists = _.isEmpty(this.props.workLists) ? {} : this.updateWorkList();
        const workLists = _.isEmpty(updatedWorkLists) ? new WorkLists(new WorkList(subjectType.name)
            .withAddMember(params)
            .withAddMember(params)) : updatedWorkLists;
        CHSNavigator.navigateToRegisterView(this, workLists);
    }

    updateWorkList() {
        const subjectType = this.state.member.groupRole.memberSubjectType;
        const workLists = this.props.workLists;
        workLists.addParamsToCurrentWorkList({
            subjectTypeName: subjectType.name,
            member: this.state.member,
            individualRelative: this.state.individualRelative,
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
        const title = this.state.member.groupRole.role ? this.I18n.t('addMemberRole', {role: this.state.member.groupRole.role}) : this.I18n.t('addNewMember');
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={title}/>
                    <View style={{
                        marginTop: Styles.ContentDistanceFromEdge,
                        paddingHorizontal: Styles.ContentDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        <AddMemberDetails/>
                        {this.displaySearchOption() &&
                        <View>
                            <IndividualFormElement
                                individualNameValue={_.isNil(this.state.member.memberSubject.name) ? "" : this.state.member.memberSubject.name}
                                element={new StaticFormElement('Group Member', true)}
                                inputChangeActionName={Actions.ON_MEMBER_SELECT}
                                searchHeaderMessage={searchHeaderMessage}
                                hideIcon={!_.isNil(this.props.params)}
                                memberSubjectType={this.state.member.groupRole.memberSubjectType}
                                validationResult={AbstractDataEntryState.getValidationError(this.state, 'GROUP_MEMBER')}/>
                            <ValidationErrorMessage
                                validationResult={AbstractDataEntryState.getValidationError(this.state, IndividualRelative.validationKeys.RELATIVE)}/>
                            {this.displayRegistrationOption() &&
                            this.renderRegistrationButton(this.state.member.groupRole.memberSubjectType)}
                        </View>
                        }
                        {!_.isEmpty(this.state.member.memberSubject) &&
                        <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                       next={{func: () => this.next(), label: this.I18n.t(nextLabel)}}
                                       nextAndMore={this.nextAndMore}
                                       style={{marginHorizontal: 24}}/>
                        }
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default AddNewMemberView;
