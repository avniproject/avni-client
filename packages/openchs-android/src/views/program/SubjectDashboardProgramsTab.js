import {Alert, ScrollView, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {ProgramEnrolmentDashboardActionsNames as Actions} from "../../action/program/ProgramEnrolmentDashboardActions";
import Observations from "../common/Observations";
import {Text} from "native-base";
import ProgramList from "./ProgramList";
import moment from "moment";
import PreviousEncounters from "../common/PreviousEncounters";
import Colors from "../primitives/Colors";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";
import ContextAction from "../viewmodel/ContextAction";
import Fonts from '../primitives/Fonts';
import General from "../../utility/General";
import ProgramActionsView from './ProgramActionsView';
import Styles from "../primitives/Styles";
import FormMappingService from "../../service/FormMappingService";
import PrivilegeService from "../../service/PrivilegeService";
import {Form, Privilege} from 'avni-models';
import _ from "lodash";
import Distances from "../primitives/Distances";
import ObservationsSectionOptions from "../common/ObservationsSectionOptions";
import Icon from 'react-native-vector-icons/SimpleLineIcons'
import Separator from "../primitives/Separator";

class SubjectDashboardProgramsTab extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: PropTypes.string,
        individualUUID: PropTypes.string.isRequired,
        backFunction: PropTypes.func
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolmentDashboard);
        this.getForm = this.getForm.bind(this);
        this.getExitForm = this.getExitForm.bind(this);
        this.privilegeService = context.getService(PrivilegeService);
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LANDING, this.props);
        return super.UNSAFE_componentWillMount();
    }

    componentDidMount() {
        this.dispatchOnLoad();
    }

    dispatchOnLoad() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
    }

    componentWillReceiveProps() {
        if (this.state.possibleExternalStateChange) {
            this.dispatchOnLoad();
        }
    }

    didFocus() {
        super.didFocus();
        this.dispatchAction(Actions.ON_FOCUS, this.props);
    }

    editEnrolment(pageNumber) {
        this.dispatchAction(Actions.ON_EDIT_ENROLMENT, {
            cb: (enrolment, workLists) => CHSNavigator.navigateToProgramEnrolmentView(this, enrolment, workLists, true, pageNumber)
        });
    }

    editExit(pageNumber) {
        this.dispatchAction(Actions.ON_EDIT_ENROLMENT_EXIT, {
            cb: (enrolment, workLists) => CHSNavigator.navigateToExitProgram(this, enrolment, workLists, true, pageNumber)
        });
    }

    exitProgram() {
        this.dispatchAction(Actions.ON_EXIT_ENROLMENT, {
            cb: (enrolment, workLists) => CHSNavigator.navigateToExitProgram(this, enrolment, workLists)
        });
    }

    enrolmentSelect(enrolmentUUID) {
        this.dispatchAction(Actions.ON_ENROLMENT_CHANGE, {enrolmentUUID: enrolmentUUID});
    }

    getHeaderMessage(enrolment) {
        return (
            <View>
                <Text>{`${this.I18n.t("enrolledOn")} ${moment(enrolment.enrolmentDateTime).format("DD-MM-YYYY")}`}</Text>
                {!_.isNil(this.state.enrolment.programExitDateTime) &&
                <Text>{`${this.I18n.t("exitedOn")} ${moment(enrolment.programExitDateTime).format("DD-MM-YYYY")}`}</Text>}
                <Text>{`${this.I18n.t("programName")} ${this.I18n.t(_.get(enrolment, 'program.displayName'))}`}</Text>
            </View>
        )
    }

    getExitHeaderMessage(enrolment) {
        return `${this.I18n.t("exitedOn")} ${moment(enrolment.programExitDateTime).format("DD-MM-YYYY")}`;
    }

    getForm() {
        const formMappingService = this.context.getService(FormMappingService);
        return formMappingService.findFormForProgramEnrolment(this.state.enrolment.program, this.state.enrolment.individual.subjectType);
    }

    getExitForm() {
        const formMappingService = this.context.getService(FormMappingService);
        return formMappingService.findFormForProgramExit(this.state.enrolment.program, this.state.enrolment.individual.subjectType);
    }

    getEnrolmentContextActions(isExit, hasEditPrivilege) {
        return hasEditPrivilege ?
            [new ContextAction('edit', () => isExit ? this.editExit() : this.editEnrolment())] : [];
    }

    joinProgram() {
        Alert.alert(
            this.I18n.t('undoExitProgramTitle'),
            this.I18n.t('undoExitProgramConfirmationMessage'),
            [
                {text: this.I18n.t('yes'), onPress: () => this.dispatchAction(Actions.ON_PROGRAM_REJOIN)},
                {
                    text: this.I18n.t('no'), onPress: _.noop, style: 'cancel'
                }
            ]
        )
    }

    getPrimaryEnrolmentContextAction(hasExitPrivilege) {
        if (!this.state.hideExit && hasExitPrivilege) {
            return _.isNil(this.state.enrolment.programExitDateTime) ?
                new ContextAction('exitProgram', () => this.exitProgram()) :
                new ContextAction('undoExit', () => this.joinProgram());
        }
    }

    enrolments() {
        const nonVoidedEnrolments = this.state.enrolment.individual.nonVoidedEnrolments();
        return _.isEmpty(nonVoidedEnrolments) ? [] : nonVoidedEnrolments;
    }

    renderPlannedVisits(allowedEncounterTypeUuids) {
        const cancelEncounterCriteria = `privilege.name = '${Privilege.privilegeName.cancelVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND subjectTypeUuid = '${this.state.enrolment.individual.subjectType.uuid}' AND programUuid = '${this.state.enrolment.program.uuid}'`;
        const allowedEncounterTypeUuidsForCancelVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(cancelEncounterCriteria, 'programEncounterTypeUuid');
        const programEnrolment = this.state.enrolment;
        const scheduledEncounters = _.filter(programEnrolment.nonVoidedEncounters(), (encounter) => !encounter.encounterDateTime && !encounter.cancelDateTime);
        return (<PreviousEncounters encounters={scheduledEncounters}
                                    allowedEncounterTypeUuidsForCancelVisit={allowedEncounterTypeUuidsForCancelVisit}
                                    allowedEncounterTypeUuidsForPerformVisit={allowedEncounterTypeUuids}
                                    formType={Form.formTypes.ProgramEncounter}
                                    showCount={this.state.showCount}
                                    showPartial={false}
                                    title={this.I18n.t('visitsPlanned')}
                                    emptyTitle={this.I18n.t('noPlannedEncounters')}
                                    subjectInfo={`${programEnrolment.individual.name}, ${programEnrolment.program.displayName}`}
                                    expandCollapseView={false}/>);
    }

    renderCompletedVisits() {
        const programEnrolment = this.state.enrolment;
        const actualEncounters = this.state.completedEncounters;
        const visitEditCriteria = `privilege.name = '${Privilege.privilegeName.editVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = '${this.state.enrolment.program.uuid}' AND subjectTypeUuid = '${this.state.enrolment.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForEditVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(visitEditCriteria, 'programEncounterTypeUuid');
        return (<PreviousEncounters encounters={actualEncounters}
                                    allowedEncounterTypeUuidsForEditVisit={allowedEncounterTypeUuidsForEditVisit}
                                    formType={Form.formTypes.ProgramEncounter}
                                    cancelFormType={Form.formTypes.ProgramEncounterCancellation}
                                    showCount={this.state.showCount}
                                    showPartial={true}
                                    title={this.I18n.t('visitsCompleted')}
                                    emptyTitle={this.I18n.t('noCompletedEncounters')}
                                    expandCollapseView={true}
                                    onToggleAction={Actions.ON_ENCOUNTER_TOGGLE}
                                    subjectInfo={`${programEnrolment.individual.name}, ${programEnrolment.program.displayName}`}
        />);
    }

    renderExitObservations() {
        const editPrivilegeCriteria = `privilege.name = '${Privilege.privilegeName.editEnrolmentDetails}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}' AND subjectTypeUuid = '${this.state.enrolment.individual.subjectType.uuid}' AND programUuid = '${this.state.enrolment.program.uuid}'`;
        const hasEditPrivilege = this.privilegeService.hasActionPrivilegeForCriteria(editPrivilegeCriteria, 'programUuid');
        const enrolmentIsActive = this.state.enrolment.isActive;
        return enrolmentIsActive ? (<View/>) :
            (<View style={{
                padding: Distances.ScaledContentDistanceFromEdge,
                margin: 4,
                elevation: 2,
                backgroundColor: Colors.cardBackgroundColor,
                marginVertical: 16
            }}>
                <Text style={[Fonts.MediumBold]}>{this.getExitHeaderMessage(this.state.enrolment)}</Text>
                <Observations form={this.getExitForm()}
                              observations={_.defaultTo(this.state.enrolment.programExitObservations, [])}
                              style={{marginVertical: DGS.resizeHeight(8)}}
                              quickFormEdit={hasEditPrivilege}
                              onFormElementGroupEdit={(pageNumber) => this.editExit(pageNumber)}
                />
                <ObservationsSectionOptions contextActions={this.getEnrolmentContextActions(true, hasEditPrivilege)}/>
            </View>);
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
                <Text style={Styles.cardTitle}>{this.I18n.t('summary')}</Text>
                {this.getHeaderMessage(this.state.enrolment)}
            </View>
            <Observations observations={_.defaultTo(this.state.enrolmentSummary, [])}
                          style={{marginVertical: DGS.resizeHeight(8)}}/>
        </View>
    }

    renderEnrolmentDetails() {
        const exitPrivilegeCriteria = `privilege.name = '${Privilege.privilegeName.exitEnrolment}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}' AND subjectTypeUuid = '${this.state.enrolment.individual.subjectType.uuid}' AND programUuid = '${this.state.enrolment.program.uuid}'`;
        const editPrivilegeCriteria = `privilege.name = '${Privilege.privilegeName.editEnrolmentDetails}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}' AND subjectTypeUuid = '${this.state.enrolment.individual.subjectType.uuid}' AND programUuid = '${this.state.enrolment.program.uuid}'`;
        const hasExitPrivilege = this.privilegeService.hasActionPrivilegeForCriteria(exitPrivilegeCriteria, 'programUuid');
        const hasEditPrivilege = this.privilegeService.hasActionPrivilegeForCriteria(editPrivilegeCriteria, 'programUuid');
        return (<View style={{
            padding: Distances.ScaledContentDistanceFromEdge,
            margin: 4,
            elevation: 2,
            backgroundColor: Colors.cardBackgroundColor,
            marginVertical: 16
        }}>
            <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_ENROLMENT_TOGGLE)}>
                <Text style={Styles.cardTitle}>{this.I18n.t('enrolmentDetails')}</Text>
                <View style={{right: 2, position: 'absolute', alignSelf: 'center'}}>
                    {this.state.expandEnrolmentInfo === false ?
                        <Icon name={'arrow-down'} size={12}/> :
                        <Icon name={'arrow-up'} size={12}/>}
                </View>
            </TouchableOpacity>
            {this.state.expandEnrolmentInfo === true ?
                <View>
                    <Observations form={this.getForm()}
                                  observations={this.state.enrolment.observations}
                                  style={{marginVertical: DGS.resizeHeight(8)}}
                                  quickFormEdit={hasEditPrivilege}
                                  onFormElementGroupEdit={(pageNumber) => this.editEnrolment(pageNumber)}
                                  />
                </View> : <View/>}
            <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_ENROLMENT_TOGGLE)}>
                <View style={{paddingTop: 6}}>
                    <ObservationsSectionOptions contextActions={this.getEnrolmentContextActions(false, hasEditPrivilege)}
                                                primaryAction={this.getPrimaryEnrolmentContextAction(hasExitPrivilege)}/>
                </View>
            </TouchableOpacity>
        </View>);
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        let enrolments = _.reverse(_.sortBy(this.enrolments(), (enrolment) => enrolment.enrolmentDateTime));
        const dashboardButtons = this.state.dashboardButtons || [];
        const performVisitCriteria = this.state.enrolment.program && `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND subjectTypeUuid = '${this.state.enrolment.individual.subjectType.uuid}' AND programUuid = '${this.state.enrolment.program.uuid}'` || '';
        const allowedEncounterTypeUuids = this.privilegeService.allowedEntityTypeUUIDListForCriteria(performVisitCriteria, 'programEncounterTypeUuid');
        return (
            <View style={{backgroundColor: Colors.GreyContentBackground}}>
                <View style={{backgroundColor: Styles.defaultBackground}}>
                </View>
                <ScrollView style={{
                    flexDirection: 'column',
                    borderRadius: 5,
                    marginHorizontal: 16,
                    backgroundColor: Colors.GreyContentBackground
                }}>
                    <View style={{marginHorizontal: 8}}>
                        {this.state.enrolment.individual.voided &&
                        <Text style={{
                            fontSize: Fonts.Large,
                            color: Styles.redColor
                        }}>{this.I18n.t("thisIndividualHasBeenVoided")}</Text>
                        }
                        <Text style={{
                            fontSize: Fonts.Large,
                            color: Colors.InputNormal
                        }}>{this.I18n.t('programList')}</Text>
                        <View style={{
                            flex: 2,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'stretch'
                        }}>
                            <View style={{justifyContent: 'flex-start', flex: 1}}>
                                <ProgramList enrolments={enrolments}
                                             selectedEnrolment={this.state.enrolment}
                                             onProgramSelect={(enrolment) => this.enrolmentSelect(enrolment.uuid)}/>
                            </View>
                            <ProgramActionsView programDashboardButtons={dashboardButtons}
                                                enrolment={this.state.enrolment}
                                                onOpenChecklist={() => this.openChecklist()}
                                                allowedEncounterTypeUuids={allowedEncounterTypeUuids}
                            />
                        </View>
                    </View>
                    {enrolments.length > 0 ? (
                        <View>
                            {this.renderSummary()}
                            {this.renderExitObservations()}
                            {this.renderPlannedVisits(allowedEncounterTypeUuids)}
                            {this.renderEnrolmentDetails()}
                            {this.renderCompletedVisits()}
                        </View>
                    ) : (
                        <View/>
                    )}
                </ScrollView>
                <Separator height={110} backgroundColor={Colors.GreyContentBackground}/>
            </View>
        );
    }
}

export default SubjectDashboardProgramsTab;
