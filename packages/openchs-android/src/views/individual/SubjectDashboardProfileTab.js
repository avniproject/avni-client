import {Alert, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import Observations from "../common/Observations";
import {IndividualRegistrationDetailsActionsNames as Actions} from "../../action/individual/IndividualRegistrationDetailsActions";
import General from "../../utility/General";
import Styles from "../primitives/Styles";
import Fonts from "../primitives/Fonts";
import ObservationsSectionTitle from '../common/ObservationsSectionTitle';
import Relatives from "../common/Relatives";
import ContextAction from "../viewmodel/ContextAction";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualAddRelativeView from "../individual/IndividualAddRelativeView";
import Colors from "../primitives/Colors";
import {Privilege, WorkItem, WorkList, WorkLists} from "avni-models";
import ObservationsSectionOptions from "../common/ObservationsSectionOptions";
import Separator from "../primitives/Separator";
import Distances from "../primitives/Distances";
import Icon from 'react-native-vector-icons/SimpleLineIcons';
import GenericDashboardView from "../program/GenericDashboardView";
import FormMappingService from "../../service/FormMappingService";
import PrivilegeService from "../../service/PrivilegeService";
import Members from "../groupSubject/Members";
import AddNewMemberView from "../groupSubject/AddNewMemberView";
import RemoveMemberView from "../groupSubject/RemoveMemberView";
import {AvniAlert} from "../common/AvniAlert";
import _ from "lodash";
import {firebaseEvents, logEvent} from "../../utility/Analytics";

class SubjectDashboardProfileTab extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualRegistrationDetails);
        this.formMappingService = context.getService(FormMappingService);
        this.privilegeService = context.getService(PrivilegeService);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    getRelativeActions() {
        return [new ContextAction(this.I18n.t('addRelative'), () => {
            CHSNavigator.navigateToAddRelativeView(this, this.state.individual,
                (source) => TypedTransition.from(source)
                    .resetStack([IndividualAddRelativeView], [
                        TypedTransition.createRoute(GenericDashboardView, {
                            individualUUID: this.state.individual.uuid,
                            message: this.I18n.t('newRelativeAddedMsg'),
                            tab: 1
                        })
                    ])
            )
        })];
    }

    addMemberActions() {
        const addMemberCriteria = `privilege.name = '${Privilege.privilegeName.addMember}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const allowedSubjectTypesForAddMember = this.privilegeService.allowedEntityTypeUUIDListForCriteria(addMemberCriteria, 'subjectTypeUuid');
        if (!this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypesForAddMember, this.state.individual.subjectType.uuid)) {
            return [new ContextAction(this.I18n.t('addMember'), () => {
                CHSNavigator.navigateToAddMemberView(this, this.state.individual)
            })];
        } else return []
    }

    onMemberEdit(groupSubject) {
        TypedTransition.from(this).with({groupSubject}).to(AddNewMemberView)
    }

    onMemberRemove(groupSubject) {
        TypedTransition.from(this).with({groupSubject}).to(RemoveMemberView);
    }

    alert(title, message, onYesPress) {
        Alert.alert(title, message, [
            {
                text: this.I18n.t('yes'), onPress: onYesPress
            },
            {
                text: this.I18n.t('no'), onPress: () => {
                },
                style: 'cancel'
            }
        ])
    }

    onRelativeDeletePress(individualRelative) {
        AvniAlert(this.I18n.t('deleteRelativeNoticeTitle'), this.I18n.t('deleteRelativeConfirmationMessage', {
            individualA: individualRelative.individual.name,
            individualB: individualRelative.relative.name
        }), () => this.dispatchAction(Actions.ON_DELETE_RELATIVE, {individualRelative: individualRelative}), this.I18n, true)
    }

    editProfile() {
        logEvent(firebaseEvents.EDIT_SUBJECT);
        CHSNavigator.navigateToRegisterView(this, new WorkLists(
            new WorkList(`${this.state.individual.subjectType.name} `,
                [new WorkItem(General.randomUUID(), WorkItem.type.REGISTRATION,
                    {
                        uuid: this.state.individual.uuid,
                        subjectTypeName: this.state.individual.subjectType.name
                    })])));
    }

    editSubjectByFEG(pageNumber) {
        logEvent(firebaseEvents.EDIT_SUBJECT);
        CHSNavigator.navigateToRegisterView(this, new WorkLists(
            new WorkList(`${this.state.individual.subjectType.name} `,
                [new WorkItem(General.randomUUID(), WorkItem.type.REGISTRATION,
                    {
                        uuid: this.state.individual.uuid,
                        subjectTypeName: this.state.individual.subjectType.name,
                    })])), pageNumber);
    }

    onSubjectSelection(individualUUID) {
        TypedTransition.from(this).resetStack([GenericDashboardView],
            [TypedTransition.createRoute(GenericDashboardView, {individualUUID, tab: 1}, true)])
    }

    renderRelatives() {
        const individualToComeBackTo = this.state.individual;
        return (
            <View style={{marginTop: 20}}>
                <View style={{paddingLeft: 10}}>
                    <ObservationsSectionTitle contextActions={this.getRelativeActions()}
                                              title={this.I18n.t('Relatives')}
                                              titleStyle={Styles.cardTitle}/>
                </View>
                <Relatives relatives={this.state.relatives}
                           style={{marginVertical: DGS.resizeHeight(8)}}
                           onRelativeSelection={(source, individual) => this.onSubjectSelection(individual.uuid)}
                           onRelativeDeletion={this.onRelativeDeletePress.bind(this)}/>
            </View>
        );
    }

    renderMembers() {
        const groupSubjects = this.state.groupSubjects;
        const applicableActions = [];
        const editMemberCriteria = `privilege.name = '${Privilege.privilegeName.editMember}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const removeMemberCriteria = `privilege.name = '${Privilege.privilegeName.removeMember}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const allowedSubjectTypesForEditMember = this.privilegeService.allowedEntityTypeUUIDListForCriteria(editMemberCriteria, 'subjectTypeUuid');
        const allowedSubjectTypesForRemoveMember = this.privilegeService.allowedEntityTypeUUIDListForCriteria(removeMemberCriteria, 'subjectTypeUuid');
        const editAllowed = this.checkPrivilege(allowedSubjectTypesForEditMember, applicableActions, {label:'edit', fn: (groupSubject) => this.onMemberEdit(groupSubject)});
        const removeAllowed = this.checkPrivilege(allowedSubjectTypesForRemoveMember, applicableActions, {label:'remove', fn: (groupSubject) => this.onMemberRemove(groupSubject)});
        return (
            <View style={styles.container}>
                <TouchableOpacity
                    onPress={() => this.dispatchAction(Actions.ON_TOGGLE, {keyName: 'expandMembers'})}>
                    <ObservationsSectionTitle contextActions={this.addMemberActions()}
                                              title={`${this.I18n.t('members')} (${groupSubjects.length})`}
                                              titleStyle={Styles.cardTitle}/>
                    <View style={{right: 2, position: 'absolute', alignSelf: 'center'}}>
                        {this.state.expandMembers === false ?
                            <Icon name={'arrow-down'} size={12}/> :
                            <Icon name={'arrow-up'} size={12}/>}
                    </View>
                </TouchableOpacity>
                <View style={{marginTop: 3}}>
                    {this.state.expandMembers === true && groupSubjects.length > 0 ?
                        <View style={styles.memberCard}>
                            <Members groupSubjects={groupSubjects}
                                     onMemberSelection={(memberSubjectUUID) => this.onSubjectSelection(memberSubjectUUID)}
                                     actions={applicableActions}
                                     editAllowed={editAllowed}
                                     removeAllowed={removeAllowed}/>
                        </View> : <View/>}
                </View>
            </View>
        );
    }


    checkPrivilege(allowedSubjectTypes, applicableActions, action) {
        if (!this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypes, this.state.individual.subjectType.uuid)) {
            applicableActions.push(action);
            return true;
        }
        return false;
    }

    renderVoided() {
        return (
            <View>
                <Text style={{fontSize: Fonts.Large, color: Styles.redColor}}>
                    {this.I18n.t("thisIndividualHasBeenVoided")}
                </Text>
                <ObservationsSectionOptions
                    contextActions={[new ContextAction('unVoid', () => this.unVoidIndividual())]}/>
            </View>
        );
    }

    voidUnVoidAlert(title, message, setVoided) {
        Alert.alert(
            this.I18n.t(title),
            this.I18n.t(message),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                        this.dispatchAction(Actions.VOID_UN_VOID_INDIVIDUAL,
                            {
                                individualUUID: this.props.params.individualUUID,
                                setVoided: setVoided,
                                cb: () => {
                                }
                            },
                        );
                    }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                    },
                    style: 'cancel'
                }
            ]
        )
    }

    voidIndividual() {
        this.voidUnVoidAlert('voidIndividualConfirmationTitle', 'voidIndividualConfirmationMessage', true)
    }

    unVoidIndividual() {
        this.voidUnVoidAlert('unVoidIndividualConfirmationTitle', 'unVoidIndividualConfirmationMessage', false)
    }

    renderSelectionOptions() {
        const form = this.formMappingService.findRegistrationForm(this.state.individual.subjectType);
        const editProfileCriteria = `privilege.name = '${Privilege.privilegeName.editSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}' AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const voidProfileCriteria = `privilege.name = '${Privilege.privilegeName.voidSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}' AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedSubjectTypeUuidsForEdit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(editProfileCriteria, 'subjectTypeUuid');
        const allowedSubjectTypeUuidsForVoid = this.privilegeService.allowedEntityTypeUUIDListForCriteria(voidProfileCriteria, 'subjectTypeUuid');
        const requiredActions = [];
        if (!this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUuidsForVoid, this.state.individual.subjectType.uuid))
            requiredActions.push(new ContextAction('void', () => this.voidIndividual(), Colors.CancelledVisitColor));
        if (!this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUuidsForEdit, this.state.individual.subjectType.uuid))
            requiredActions.push(new ContextAction('edit', () => this.editProfile()));
        return _.isEmpty(form) ? <View/> :
            <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_TOGGLE, {keyName: 'expand'})}>
                <ObservationsSectionOptions
                    contextActions={requiredActions}/>
            </TouchableOpacity>
    }

    renderProfile() {
        const formMappingService = this.context.getService(FormMappingService);
        return <View>
            <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_TOGGLE, {keyName: 'expand'})}>
                <View styel={{flexDirection: 'column'}}>
                    <Text style={[Styles.cardTitle, {color: Colors.DefaultPrimaryColor}]}>
                        {this.I18n.t("registrationInformation")}
                    </Text>
                    <Text style={{fontSize: Fonts.Medium, color: Colors.DefaultPrimaryColor}}>
                        {`${this.I18n.t("registeredOn")}${General.toDisplayDate(this.state.individual.registrationDate)}`}
                    </Text>
                </View>
                <View style={{right: 2, position: 'absolute', alignSelf: 'center'}}>
                    {this.state.expand === false ?
                        <Icon name={'arrow-down'} size={12}/> :
                        <Icon name={'arrow-up'} size={12}/>}
                </View>
            </TouchableOpacity>
            <View style={{marginTop: 3}}>
                {this.state.expand === true ?
                    <View style={{paddingHorizontal: 10}}>
                        <Observations form={formMappingService.findRegistrationForm(this.state.individual.subjectType)}
                                      observations={this.state.individual.observations}
                                      style={{marginVertical: 3}}
                                      quickFormEdit={true}
                                      onFormElementGroupEdit={(pageNumber) => this.editSubjectByFEG(pageNumber)}
                        />
                    </View> : <View/>}
                {this.renderSelectionOptions()}
            </View>
        </View>
    }

    renderSummary() {
        return <View style={{
            padding: Distances.ScaledContentDistanceFromEdge,
            margin: 4,
            elevation: 2,
            backgroundColor: Colors.cardBackgroundColor,
            marginVertical: 16
        }}>
            <View>
                <Text style={Styles.cardTitle}>{this.I18n.t('subjectSummary')}</Text>
            </View>
            <Observations observations={_.defaultTo(this.state.subjectSummary, [])}
                          style={{marginVertical: DGS.resizeHeight(8)}}/>
        </View>
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const relativesFeatureToggle = this.state.individual.isPerson() && this.state.isRelationshipTypePresent;
        const groupSubjectToggle = this.state.individual.subjectType.isGroup();
        return (
            <View style={{backgroundColor: Colors.GreyContentBackground}}>
                <View style={{backgroundColor: Styles.defaultBackground}}>
                </View>
                <View style={{marginHorizontal: 10, marginTop: 10}}>
                    {!_.isEmpty(this.state.subjectSummary) && this.renderSummary()}
                    <View style={styles.container}>
                        {this.state.individual.voided ? this.renderVoided() : this.renderProfile()}
                    </View>
                    {relativesFeatureToggle ? this.renderRelatives() : <View/>}
                    {groupSubjectToggle ? this.renderMembers() : <View/>}
                </View>
                <Separator height={110} backgroundColor={Colors.GreyContentBackground}/>
            </View>
        );
    }
}

export default SubjectDashboardProfileTab;


const styles = StyleSheet.create({
    container: {
        padding: Distances.ScaledContentDistanceFromEdge,
        margin: 4,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 3,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 5,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
    },
    memberCard: {
        marginTop: 5,
        marginHorizontal: 6,
        paddingVertical: 10,
        borderBottomLeftRadius: 1.5,
        borderBottomRightRadius: 1.5,
        borderTopLeftRadius: 1.5,
        borderTopRightRadius: 1.5,
        shadowOffset: {width: 10, height: 10},
        shadowColor: Styles.greyBackground,
        shadowOpacity: 1,
        elevation: 1,
    }
});
