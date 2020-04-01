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
import {AddNewMemberActions as Actions} from "../../action/groupSubject/AddNewMemberAction";
import {Alert, Text, ToastAndroid, TouchableOpacity, View} from "react-native";
import Styles from "../primitives/Styles";
import IndividualFormElement from "../form/formElement/IndividualFormElement";
import _ from "lodash";
import StaticFormElement from "../viewmodel/StaticFormElement";
import WizardButtons from "../common/WizardButtons";
import Colors from "../primitives/Colors";
import AddMemberDetails from "./AddMemberDetails";
import {WorkList, WorkLists, WorkItem} from "avni-models";
import TypedTransition from "../../framework/routing/TypedTransition";
import GenericDashboardView from "../program/GenericDashboardView";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";

@Path('/addNewMemberView')
class AddNewMemberView extends AbstractComponent {

    static propTypes = {
        groupSubject: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addNewMember);
    }

    viewName() {
        return 'AddNewMemberView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.componentWillMount();
    }

    previous() {
        CHSNavigator.goBack(this);
    }

    displayMessage(message) {
        if (message && this.state.messageDisplayed) {
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.dispatchAction(Actions.DISPLAY_MESSAGE)
        }
    }

    save() {
        if (this.state.member.memberSubject.voided) {
            Alert.alert(this.I18n.t("voidedIndividualAlertTitle"),
                this.I18n.t("voidedIndividualAlertMessage"));
        } else {
            this.dispatchAction(Actions.ON_SAVE, {
                cb: () => TypedTransition.from(this).resetStack([AddNewMemberView, GenericDashboardView],
                    [TypedTransition.createRoute(GenericDashboardView, {
                        individualUUID: this.state.member.groupSubject.uuid,
                        message: this.I18n.t('newMemberAddedMsg'),
                        tab: 1
                    })])
            });
        }
    }

    next() {
        if (_.isNil(this.props.params)) {
            return this.save();
        } else {
            const memberSubject = this.state.member.memberSubject;
            CHSNavigator.navigateToRegisterView(this, new WorkLists(new WorkList(`${memberSubject.subjectType.name} `,
                [new WorkItem(General.randomUUID(), WorkItem.type.ADD_MEMBER,
                    {
                        uuid: memberSubject.uuid,
                        subjectTypeName: memberSubject.subjectType.name,
                        member: this.state.member
                    }
                )])));
        }
    }

    proceedToRegistration(subjectType) {
        const params = {
            subjectTypeName: subjectType.name,
            member: this.state.member,
            groupSubjectUUID: this.state.member.groupSubject.uuid,
        };
        CHSNavigator.navigateToRegisterView(this, new WorkLists(new WorkList(this.I18n.t(`REG_DISPLAY-${subjectType.name}`))
            .withAddMember(params)
            .withAddMember(params)
        ));
    }

    isMemberDetailsEmpty() {
        return _.isEmpty(this.state.member.groupRole) || _.isEmpty(this.state.member.membershipStartDate);
    }

    displaySearchOption() {
        return !this.isMemberDetailsEmpty() && _.isEmpty(this.state.validationResults);
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
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('addNewMember')}/>
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
                            {this.displayRegistrationOption() &&
                            <View style={{flexDirection: 'column', alignItems: 'center', alignSelf: 'center'}}>
                                <Text>{this.I18n.t('or')}</Text>
                                <TouchableOpacity
                                    style={{
                                        marginTop: 20,
                                        paddingVertical: 10,
                                        backgroundColor: Colors.ActionButtonColor,
                                        borderRadius: 15
                                    }}
                                    activeOpacity={.5}
                                    onPress={() => this.proceedToRegistration(this.state.member.groupRole.memberSubjectType)}>
                                    <Text style={{
                                        color: Colors.TextOnPrimaryColor,
                                        textAlign: 'center',
                                        paddingHorizontal: 40
                                    }}>{this.I18n.t('registerNewMember')}</Text>
                                </TouchableOpacity>
                            </View>}
                        </View>
                        }
                        {!_.isEmpty(this.state.member.memberSubject) &&
                        <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                       next={{func: () => this.next(), label: this.I18n.t(nextLabel)}}
                                       style={{marginHorizontal: 24}}/>
                        }
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default AddNewMemberView;
