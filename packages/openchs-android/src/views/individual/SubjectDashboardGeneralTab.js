import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, View} from 'react-native';
import {Actions} from "../../action/individual/IndividualGeneralHistoryActions";
import Reducers from "../../reducer";
import PreviousEncounters from "../common/PreviousEncounters";
import _ from "lodash";
import Colors from '../primitives/Colors';
import {Form, Privilege} from 'avni-models';
import Separator from "../primitives/Separator";
import CHSNavigator from "../../utility/CHSNavigator";
import ActionSelector from "../common/ActionSelector";
import PrivilegeService from "../../service/PrivilegeService";
import NewFormButton from "../common/NewFormButton";

class SubjectDashboardGeneralTab extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualGeneralHistory);
        this.privilegeService = context.getService(PrivilegeService);
    }

    componentWillMount() {
        const newEncounterCallback = (encounter) => {
            CHSNavigator.navigateToEncounterView(this, {
                individualUUID: this.props.params.individualUUID,
                encounter: encounter,
            });
        };
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: this.props.params.individualUUID, newEncounterCallback});
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.individual);
    }

    deleteDraft(encounterUUID) {
        this.dispatchAction(Actions.DELETE_DRAFT, {encounterUUID});
    }

    renderDraftVisits() {
        const drafts = this.state.draftEncounters;
        return (<PreviousEncounters encounters={drafts}
                                    allowedEncounterTypeUuidsForCancelVisit={[]}
                                    allowedEncounterTypeUuidsForPerformVisit={[]}
                                    formType={Form.formTypes.Encounter}
                                    style={{marginBottom: 21}}
                                    showPartial={false}
                                    showCount={this.state.showCount}
                                    title={this.I18n.t('drafts')}
                                    emptyTitle={this.I18n.t('noDrafts')}
                                    expandCollapseView={false}
                                    containsDrafts={true}
                                    deleteDraft={(encounterUUID) => this.deleteDraft(encounterUUID)}
                                    hideIfEmpty={true}
                                    subjectInfo={this.state.individual.name}/>);
    }

    renderPlannedVisits() {
        const scheduledEncounters = _.filter(_.map(this.state.encounters, 'encounter'), (encounter) => !encounter.encounterDateTime && !encounter.cancelDateTime);
        const cancelVisitCriteria = `privilege.name = '${Privilege.privilegeName.cancelVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForCancelVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(cancelVisitCriteria, 'encounterTypeUuid');
        const performVisitCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForPerformVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(performVisitCriteria, 'encounterTypeUuid');
        return (<PreviousEncounters encounters={scheduledEncounters}
                                    allowedEncounterTypeUuidsForCancelVisit={allowedEncounterTypeUuidsForCancelVisit}
                                    allowedEncounterTypeUuidsForPerformVisit={allowedEncounterTypeUuidsForPerformVisit}
                                    formType={Form.formTypes.Encounter}
                                    style={{marginBottom: 21}}
                                    showPartial={false}
                                    showCount={this.state.showCount}
                                    title={this.I18n.t('visitsPlanned')}
                                    emptyTitle={this.I18n.t('noPlannedEncounters')}
                                    expandCollapseView={false}
                                    subjectInfo={this.state.individual.name}/>);
    }

    renderCompletedVisits() {
        const actualEncounters = _.filter(this.state.encounters, ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime);
        const visitEditCriteria = `privilege.name = '${Privilege.privilegeName.editVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForEditVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(visitEditCriteria, 'encounterTypeUuid');

        return (<PreviousEncounters encounters={actualEncounters}
                                    allowedEncounterTypeUuidsForEditVisit={allowedEncounterTypeUuidsForEditVisit}
                                    formType={Form.formTypes.Encounter}
                                    cancelFormType={Form.formTypes.IndividualEncounterCancellation}
                                    style={{marginBottom: 21}}
                                    showPartial={true}
                                    showCount={this.state.showCount}
                                    title={this.I18n.t('completedEncounters')}
                                    emptyTitle={this.I18n.t('noEncounters')}
                                    expandCollapseView={true}
                                    subjectInfo={this.state.individual.name}
                                    onToggleAction={Actions.ON_TOGGLE}/>);
    }

    render() {

        return (
            <View style={{backgroundColor: Colors.GreyContentBackground, marginTop: 10}}>
                <ActionSelector
                    title={this.I18n.t("followupTypes")}
                    hide={() => this.dispatchAction(Actions.HIDE_ENCOUNTER_SELECTOR)}
                    visible={this.state.displayActionSelector}
                    actions={this.state.encounterActions}
                />
                <View style={{marginHorizontal: 10}}>
                    <NewFormButton display={!this.props.params.displayGeneralInfoInProfileTab}/>
                    {this.renderDraftVisits()}
                    {this.renderPlannedVisits()}
                    {this.renderCompletedVisits()}
                </View>
                <Separator height={110} backgroundColor={Colors.GreyContentBackground}/>
            </View>
        );
    }
}

export default SubjectDashboardGeneralTab;
